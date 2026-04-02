const axios = require('axios');
const cheerio = require('cheerio');
const { Category, ImportBatch, Product, Role, User } = require('../schemas');
const { hashPassword } = require('./auth');
const { slugify } = require('../schemas/validators');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getHeaders = () => ({
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
});

const normalizeWhitespace = (value = '') =>
  String(value)
    .replace(/\s+/g, ' ')
    .replace(/[\u00A0]+/g, ' ')
    .trim();

const stripAccents = (value = '') =>
  normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/d/g, 'd')
    .replace(/Ð/g, 'D');

const normalizeForMatch = (value = '') => stripAccents(value).toLowerCase();

const titleCase = (value = '') =>
  normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'tp' || lower === 'tp.') {
        return 'TP';
      }
      if (lower === 'q' || lower === 'q.') {
        return 'Q.';
      }
      if (lower === 'p' || lower === 'p.') {
        return 'P.';
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

const normalizeUrl = (url, baseUrl) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    return null;
  }
};

const slugToWords = (value = '') =>
  normalizeWhitespace(
    value
      .replace(/-/g, ' ')
      .replace(/\b(tp|tphcm)\b/gi, 'TP')
      .replace(/\bhn\b/gi, 'Ha Noi')
  );

const buildExternalId = (item) => {
  if (item.sourceExternalId) {
    return String(item.sourceExternalId);
  }

  if (item.sourceUrl) {
    return slugify(item.sourceUrl);
  }

  return slugify(`${item.title}-${item.addressText || item.address || ''}`);
};

const extractPrice = (text) => Number(String(text || '').replace(/[^\d]/g, '')) || 0;

const cleanWard = (value = '') => normalizeWhitespace(value);

const isWardLike = (value = '') => /^(p\.?|phuong|phu?ng|x\.?|xa|xã|tt\.?|thi tran|th? tr?n|ward)\b/i.test(value);
const isDistrictLike = (value = '') => /^(q\.?|quan|qu?n|h\.?|huyen|huy?n|thi xa|th? xã|tp\.?|thanh pho|thành ph?)\b/i.test(value);

const parseAreaFromText = (value = '') => {
  const parts = normalizeWhitespace(value)
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (parts.length === 0) {
    return { province: '', district: '', ward: '' };
  }

  if (parts.length === 1) {
    return {
      province: '',
      district: '',
      ward: isWardLike(parts[0]) ? titleCase(cleanWard(parts[0])) : '',
    };
  }

  const provinceCandidate = parts[parts.length - 1] || '';
  const districtCandidate =
    parts.find((part) => isDistrictLike(part)) ||
    (parts.length >= 2 && !isWardLike(parts[parts.length - 2]) ? parts[parts.length - 2] : '');
  const wardCandidate =
    parts.find((part) => isWardLike(part)) ||
    (parts.length >= 3 ? parts[0] : '');

  return {
    province: isWardLike(provinceCandidate) ? '' : titleCase(provinceCandidate),
    district: titleCase(districtCandidate),
    ward: titleCase(cleanWard(wardCandidate)),
  };
};

const parseAreaFromTitle = (title = '') => {
  const match = normalizeWhitespace(title).match(/\bt?i\s+(.+?)(?:\s+du?c dang b?i|\s+duoc dang boi|$)/iu);
  if (!match) {
    return { province: '', district: '', ward: '' };
  }

  return parseAreaFromText(match[1]);
};

const parseAreaFromUrl = (sourceUrl) => {
  if (!sourceUrl) {
    return { province: '', district: '' };
  }

  try {
    const pathname = new URL(sourceUrl).pathname;
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[0] || '';
    const segments = slug.split('-');
    const districtIndex = segments.findIndex((segment) => ['quan', 'huyen', 'thi-xa', 'thanh-pho'].includes(segment));
    const provinceIndex = segments.findIndex((segment, index) => index > districtIndex && segment === 'tp');

    let district = '';
    let province = '';

    if (districtIndex >= 0) {
      const districtTokens = segments.slice(districtIndex, provinceIndex > districtIndex ? provinceIndex : undefined);
      district = titleCase(slugToWords(districtTokens.join('-')));
    }

    if (provinceIndex >= 0) {
      province = titleCase(slugToWords(segments.slice(provinceIndex).join('-')));
    } else if (districtIndex >= 0) {
      const provinceTokens = segments.slice(districtIndex + 2);
      province = titleCase(slugToWords(provinceTokens.join('-')));
    }

    return {
      province,
      district,
    };
  } catch (error) {
    return { province: '', district: '' };
  }
};

const inferVehicleType = ({ title = '', description = '', sourceUrl = '' }) => {
  const haystack = normalizeForMatch(`${title} ${description} ${sourceUrl}`);
  if (/pickup|ban tai/.test(haystack)) {
    return 'pickup';
  }
  if (/xe tai|truck/.test(haystack)) {
    return 'truck';
  }
  if (/xe van|\bvan\b/.test(haystack)) {
    return 'van';
  }
  if (/\bsuv\b/.test(haystack)) {
    return 'suv';
  }
  if (/xe may|\/mua-ban-xe-may/.test(haystack)) {
    return 'motorbike';
  }
  if (/xe dien/.test(haystack)) {
    return 'electric-bike';
  }
  if (/\boto\b|\bo to\b|\/mua-ban-oto/.test(haystack)) {
    return 'car';
  }
  return 'vehicle';
};

const extractYear = (title = '', description = '') => {
  const match = `${title} ${description}`.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const maxYear = new Date().getFullYear() + 1;
  return year >= 1990 && year <= maxYear ? year : undefined;
};

const extractVehicleBrand = (title = '') => {
  const normalized = normalizeForMatch(title);
  const brands = [
    'honda',
    'yamaha',
    'suzuki',
    'toyota',
    'hyundai',
    'kia',
    'ford',
    'mazda',
    'mitsubishi',
    'vinfast',
    'mercedes',
    'bmw',
    'audi',
    'lexus',
    'nissan',
    'chevrolet',
    'piaggio',
    'vespa',
  ];

  const brand = brands.find((item) => normalized.includes(item));
  return brand ? titleCase(brand) : '';
};

const cleanListingTitle = (title = '') => {
  const cleaned = normalizeWhitespace(
    title
      .replace(/\.\s*Mua bán.*$/iu, '')
      .replace(/\s+du?c dang b?i.*$/iu, '')
      .replace(/\s+duoc dang boi.*$/i, '')
      .replace(/\s*\|\s*Ch[o?] T[?o]t.*$/iu, '')
      .replace(/\s+t?i\s+.+$/iu, '')
      .replace(/\s+tai\s+.+$/i, '')
  );

  return cleaned || normalizeWhitespace(title);
};

const cleanImportedItem = (item) => {
  const sourceTitle = normalizeWhitespace(item.title || 'Imported from Chotot');
  const description = normalizeWhitespace(item.description || sourceTitle || 'Imported from Chotot');
  const title = cleanListingTitle(sourceTitle).substring(0, 200);
  const areaFromText = parseAreaFromText(item.addressText || item.address || '');
  const areaFromTitle = parseAreaFromTitle(sourceTitle);
  const areaFromUrl = parseAreaFromUrl(item.sourceUrl);
  const vehicleType = inferVehicleType({ title: sourceTitle, description, sourceUrl: item.sourceUrl });
  const modelYear = extractYear(sourceTitle, description);
  const vehicleBrand = extractVehicleBrand(sourceTitle);
  const province = areaFromText.province || areaFromTitle.province || areaFromUrl.province;
  const district = areaFromText.district || areaFromTitle.district || areaFromUrl.district;
  const ward = areaFromText.ward || areaFromTitle.ward || cleanWard(item.addressText || item.address || '');
  const normalizedTitle = normalizeWhitespace(
    title
      .replace(/\b(19\d{2}|20\d{2})\b/g, '')
      .replace(/\b(c?n bán|can ban|chính ch?|chinh chu|bao sang ten|bao sang tên)\b/giu, '')
  ).substring(0, 200);

  return {
    ...item,
    title,
    description: description.substring(0, 5000),
    addressText: normalizeWhitespace(item.addressText || item.address || ''),
    province,
    district,
    ward,
    vehicleType,
    modelYear,
    vehicleBrand,
    normalizedTitle,
    tags: ['chotot', 'imported', vehicleType, vehicleBrand && slugify(vehicleBrand)].filter(Boolean),
    attributes: {
      sourceTitle,
      normalizedTitle,
      modelYear,
      vehicleType,
      vehicleBrand,
      importedProvince: province,
      importedDistrict: district,
      importedWard: ward,
      rawAddressText: normalizeWhitespace(item.addressText || item.address || ''),
    },
  };
};

const ensureChototImporterUser = async () => {
  const userRole =
    (await Role.findOne({ name: 'user' })) ||
    (await Role.create({
      name: 'user',
      description: 'Standard marketplace account that can buy, sell, bid, order, and chat',
      permissions: ['product:create', 'product:update', 'product:read', 'order:create', 'order:read', 'bid:create', 'auction:create', 'chat:create', 'chat:read'],
    }));

  let user = await User.findOne({ email: 'chotot-importer@example.com' });
  if (!user) {
    user = await User.create({
      username: 'chotot_importer',
      email: 'chotot-importer@example.com',
      passwordHash: hashPassword('ChangeMe123!'),
      fullName: 'Chotot Importer',
      roles: [userRole._id],
      isVerified: false,
    });
  }

  if (!user.roles.some((roleId) => `${roleId}` === `${userRole._id}`)) {
    user.roles = [userRole._id];
    await user.save();
  }

  return user;
};

const ensureCategory = async (categoryName) => {
  const name = categoryName || 'Chotot';
  const slug = slugify(name);

  let category = await Category.findOne({ slug });
  if (!category) {
    category = await Category.create({
      name,
      slug,
      description: `Imported from Chotot: ${name}`,
      source: 'chotot',
    });
  }

  return category;
};

const parseXeCards = ($, categoryUrl, categoryName) => {
  const products = [];

  $('div.ads-card-grid').each((_, element) => {
    const card = $(element);
    const anchor = card.find('a[href]').first();
    const sourceUrl = normalizeUrl(anchor.attr('href'), categoryUrl);
    const alt = card.find('img').first().attr('alt') || '';
    const rawTitle = alt || anchor.text().trim();
    const description = rawTitle || 'Imported from Chotot';
    const price = extractPrice(card.find('p.price').first().text().trim() || card.text());
    const image = card.find('img').first().attr('src') || card.find('img').first().attr('data-src') || '';
    const address =
      card.find('span.new-location').first().text().trim() ||
      card.find('[class*="location"]').first().text().trim() ||
      '';

    if (rawTitle && price > 0) {
      products.push({
        title: rawTitle.substring(0, 400),
        description: description.substring(0, 5000),
        price,
        categoryName,
        addressText: address,
        images: image ? [image] : [],
        source: 'chotot',
        sourceUrl,
        sourceExternalId: buildExternalId({ sourceUrl, title: rawTitle, address }),
      });
    }
  });

  return products;
};

const parseGenericCards = ($, categoryUrl, categoryName) => {
  const products = [];
  const cards = $('div[id^="listing_item_"], article, li').toArray();

  cards.forEach((element) => {
    const card = $(element);
    const anchor = card.find('a[href]').first();
    const title = anchor.attr('title') || anchor.text().trim();
    const rawPrice =
      card.find('[class*="price"]').first().text().trim() ||
      card.text().match(/\d[\d\.\, ]{2,}/)?.[0] ||
      '';
    const price = extractPrice(rawPrice);
    const description =
      card.find('[class*="description"], [class*="body"]').first().text().trim() || title;
    const address =
      card.find('[class*="location"], [class*="region"]').first().text().trim() || '';
    const image =
      card.find('img').first().attr('src') || card.find('img').first().attr('data-src') || '';
    const sourceUrl = normalizeUrl(anchor.attr('href'), categoryUrl);

    if (title && price > 0) {
      products.push({
        title: title.substring(0, 400),
        description: (description || 'Imported from Chotot').substring(0, 5000),
        price,
        categoryName,
        addressText: address,
        images: image ? [image] : [],
        source: 'chotot',
        sourceUrl,
        sourceExternalId: buildExternalId({ sourceUrl, title, address }),
      });
    }
  });

  return products;
};

const scrapeChototProducts = async (categoryUrl, categoryName, maxPages = 1) => {
  const products = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = categoryUrl.includes('?') ? `${categoryUrl}&page=${page}` : `${categoryUrl}?page=${page}`;
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 20000,
    });

    const $ = cheerio.load(response.data);
    const pageProducts = categoryUrl.includes('xe.chotot.com')
      ? parseXeCards($, categoryUrl, categoryName)
      : parseGenericCards($, categoryUrl, categoryName);

    products.push(...pageProducts.map(cleanImportedItem));

    if (page < maxPages) {
      await delay(1500);
    }
  }

  return products;
};

const scrapeChototApi = async (keyword, limit = 20) => {
  const response = await axios.get('https://www.chotot.com/api/v2/ent/search', {
    headers: getHeaders(),
    params: {
      q: keyword,
      limit,
    },
    timeout: 20000,
  });

  const listings = response.data?.listings || [];
  return listings.map((item) =>
    cleanImportedItem({
      title: item.title || 'Imported from Chotot',
      description: item.body || item.description || 'Imported from Chotot',
      price: item.price || 0,
      categoryName: item.category_name || keyword || 'Chotot',
      addressText: item.region_name || item.area_name || '',
      images: (item.images || []).map((image) => image?.url || image).filter(Boolean),
      source: 'chotot',
      sourceUrl: normalizeUrl(item.listing_ad_link || item.web_url || '', 'https://www.chotot.com'),
      sourceExternalId: item.list_id ? String(item.list_id) : null,
    })
  );
};

const importChototProducts = async (
  scrapedData,
  { sourceCategory = 'general', query = '', sourceUrl = '', createdBy = null } = {}
) => {
  const seller = await ensureChototImporterUser();
  const batch = await ImportBatch.create({
    source: 'chotot',
    sourceCategory,
    query,
    sourceUrl,
    status: 'running',
    startedAt: new Date(),
    createdBy,
  });

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const item of scrapedData) {
    try {
      if (!item.title || !item.price) {
        totalSkipped += 1;
        continue;
      }

      const category = await ensureCategory(item.categoryName || sourceCategory);
      const sourceExternalId = buildExternalId(item);
      const filter = sourceExternalId
        ? { source: 'chotot', sourceExternalId }
        : { source: 'chotot', sourceUrl: item.sourceUrl };

      const existing = await Product.findOne(filter);
      const payload = {
        seller: seller._id,
        category: category._id,
        title: item.title,
        description: item.description || 'Imported from Chotot',
        price: Math.max(item.price || 0, 0),
        saleType: item.saleType || 'fixed_price',
        condition: item.condition || 'unknown',
        status: item.status || 'active',
        fulfillmentType: item.fulfillmentType || 'both',
        images: item.images?.length ? item.images : existing?.images || [],
        addressText: item.addressText || '',
        province: item.province || '',
        district: item.district || '',
        ward: item.ward || '',
        tags: item.tags?.length ? item.tags : ['chotot', 'imported'],
        attributes: {
          ...(existing?.attributes || {}),
          ...(item.attributes || {}),
        },
        source: 'chotot',
        sourceUrl: item.sourceUrl || null,
        sourceExternalId,
        importBatch: batch._id,
      };

      if (item.location?.coordinates?.length === 2) {
        payload.location = item.location;
      }

      const product = await Product.findOneAndUpdate(
        filter,
        { $set: payload },
        {
          returnDocument: 'after',
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      if (existing) {
        totalUpdated += 1;
      } else if (product) {
        totalInserted += 1;
      }
    } catch (error) {
      batch.errorItems.push({
        itemId: item.sourceExternalId || item.sourceUrl || item.title,
        message: error.message,
      });
    }
  }

  batch.status = batch.errorItems.length > 0 ? 'partial' : 'completed';
  batch.finishedAt = new Date();
  batch.totalFetched = scrapedData.length;
  batch.totalInserted = totalInserted;
  batch.totalUpdated = totalUpdated;
  batch.totalSkipped = totalSkipped;
  batch.totalFailed = batch.errorItems.length;
  await batch.save();

  return {
    batch,
    summary: {
      totalFetched: scrapedData.length,
      totalInserted,
      totalUpdated,
      totalSkipped,
      totalFailed: batch.errorItems.length,
    },
  };
};

const importFromChotot = async ({
  categoryUrl,
  categoryName,
  maxPages = 1,
  keyword,
  mode = 'html',
  createdBy = null,
} = {}) => {
  const scrapedData =
    mode === 'api'
      ? await scrapeChototApi(keyword || categoryName || 'dien thoai')
      : await scrapeChototProducts(categoryUrl, categoryName, maxPages);

  return importChototProducts(scrapedData, {
    sourceCategory: categoryName,
    query: keyword || '',
    sourceUrl: categoryUrl || '',
    createdBy,
  });
};

module.exports = {
  scrapeChototProducts,
  scrapeChototApi,
  importChototProducts,
  importFromChotot,
  cleanImportedItem,
};





