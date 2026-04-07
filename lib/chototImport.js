var axios = require('axios');
var cheerio = require('cheerio');
var { Category, ImportBatch, Product, Role, User } = require('../schemas');
var { hashPassword } = require('./auth');
var { slugify } = require('../schemas/validators');

var delay = function(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); };

var getHeaders = () => ({
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
});

var normalizeWhitespace = (value = '') =>
  String(value)
    .replace(/\s+/g, ' ')
    .replace(/[\u00A0]+/g, ' ')
    .trim();

var stripAccents = (value = '') =>
  normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/d/g, 'd')
    .replace(/Ð/g, 'D');

var normalizeForMatch = function(value = '') { return stripAccents(value).toLowerCase(); };

var titleCase = (value = '') =>
  normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      var lower = word.toLowerCase();
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

var normalizeUrl = function(url, baseUrl) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    return null;
  }
};

var isHtmlLike = function(value = '') { return /<[^>]+>/.test(String(value || '')); };

var stripHtml = function(value = '') {
  if (!isHtmlLike(value)) {
    return normalizeWhitespace(value);
  }

  var $ = cheerio.load(`<div id="fragment">${String(value || '')}</div>`);
  return normalizeWhitespace($('#fragment').text());
};

var parseSrcsetUrls = (value = '', baseUrl = '') =>
  String(value || '')
    .split(',')
    .map((part) => normalizeUrl(part.trim().split(/\s+/)[0], baseUrl))
    .filter(Boolean);

var extractHtmlAttribute = function(value = '', attribute = '') {
  var pattern = new RegExp(attribute + String.raw`\s*=\s*["']([^"']+)`, 'i');
  var match = String(value || '').match(pattern);
  return normalizeWhitespace(match?.[1] || '');
};

var extractHtmlUrls = function(value = '', attribute = 'src', baseUrl = '') {
  var pattern = new RegExp(attribute + String.raw`\s*=\s*["']([^"']+)`, 'ig');
  var matches = [...String(value || '').matchAll(pattern)];
  return matches
    .map((match) => normalizeUrl(match[1], baseUrl))
    .filter(Boolean);
};

var isPlaceholderImage = function(value = '') {
  var normalized = String(value || '').trim();
  if (!normalized) {
    return true;
  }

  return (
    /^data:image\/gif;base64/i.test(normalized) ||
    /R0lGODlhAQABAIAAAAAAAP\/\/\/yH5BAEAAAAALAAAAAABAAEAAAIBRAA7/i.test(normalized)
  );
};

var uniqueValues = function(values = []) { return [...new Set(values.filter(Boolean))]; };

var collectImageUrls = function($, root, baseUrl = '') {
  var urls = new Set();
  var nodes = $(root).find('img, source').add($(root).filter('img, source'));

  nodes.each((_, element) => {
    var node = $(element);
    ['src', 'data-src', 'data-original', 'data-image', 'data-lazy-src'].forEach((attribute) => {
      var url = normalizeUrl(node.attr(attribute), baseUrl);
      if (url && !isPlaceholderImage(url)) {
        urls.add(url);
      }
    });

    ['srcset', 'data-srcset'].forEach((attribute) => {
      parseSrcsetUrls(node.attr(attribute), baseUrl).forEach((url) => {
        if (!isPlaceholderImage(url)) {
          urls.add(url);
        }
      });
    });
  });

  return [...urls];
};

var extractMarkupInfo = function(value = '', baseUrl = '') {
  if (!isHtmlLike(value)) {
    return {
      title: '',
      images: [],
    };
  }

  var raw = String(value || '');
  var $ = cheerio.load(`<div id="fragment">${raw}</div>`);
  var fragment = $('#fragment');
  var titleCandidates = uniqueValues([
    extractHtmlAttribute(raw, 'alt'),
    extractHtmlAttribute(raw, 'title'),
    fragment.find('img').first().attr('alt'),
    fragment.find('img').first().attr('title'),
    fragment.find('[title]').first().attr('title'),
    stripHtml(value),
  ]).filter((candidate) => candidate && !candidate.startsWith('<img'));
  var images = buildImageList(
    extractHtmlUrls(raw, 'src', baseUrl),
    extractHtmlUrls(raw, 'data-src', baseUrl),
    collectImageUrls($, fragment, baseUrl)
  );

  return {
    title: titleCandidates.find(Boolean) || '',
    images,
  };
};

var buildImageList = (...groups) =>
  uniqueValues(
    groups.flatMap((group) => {
      if (!group) {
        return [];
      }
      return Array.isArray(group) ? group : [group];
    })
  ).filter((url) => !isPlaceholderImage(url));

var slugToWords = (value = '') =>
  normalizeWhitespace(
    value
      .replace(/-/g, ' ')
      .replace(/\b(tp|tphcm)\b/gi, 'TP')
      .replace(/\bhn\b/gi, 'Ha Noi')
  );

var buildExternalId = function(item) {
  if (item.sourceExternalId) {
    return String(item.sourceExternalId);
  }

  if (item.sourceUrl) {
    return slugify(item.sourceUrl);
  }

  return slugify(`${item.title}-${item.addressText || item.address || ''}`);
};

var extractPrice = function(text) { return Number(String(text || '').replace(/[^\d]/g, '')) || 0; };

var cleanWard = function(value = '') { return normalizeWhitespace(value); };

var isWardLike = function(value = '') { return /^(p\.?|phuong|phu?ng|x\.?|xa|xã|tt\.?|thi tran|th? tr?n|ward)\b/i.test(value); };
var isDistrictLike = function(value = '') { return /^(q\.?|quan|qu?n|h\.?|huyen|huy?n|thi xa|th? xã|tp\.?|thanh pho|thành ph?)\b/i.test(value); };

var parseAreaFromText = function(value = '') {
  var parts = normalizeWhitespace(value)
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

  var provinceCandidate = parts[parts.length - 1] || '';
  var districtCandidate =
    parts.find((part) => isDistrictLike(part)) ||
    (parts.length >= 2 && !isWardLike(parts[parts.length - 2]) ? parts[parts.length - 2] : '');
  var wardCandidate =
    parts.find((part) => isWardLike(part)) ||
    (parts.length >= 3 ? parts[0] : '');

  return {
    province: isWardLike(provinceCandidate) ? '' : titleCase(provinceCandidate),
    district: titleCase(districtCandidate),
    ward: titleCase(cleanWard(wardCandidate)),
  };
};

var parseAreaFromTitle = function(title = '') {
  var match = normalizeWhitespace(title).match(/\bt?i\s+(.+?)(?:\s+du?c dang b?i|\s+duoc dang boi|$)/iu);
  if (!match) {
    return { province: '', district: '', ward: '' };
  }

  return parseAreaFromText(match[1]);
};

var parseAreaFromUrl = function(sourceUrl) {
  if (!sourceUrl) {
    return { province: '', district: '' };
  }

  try {
    var pathname = new URL(sourceUrl).pathname;
    var parts = pathname.split('/').filter(Boolean);
    var slug = parts[0] || '';
    var segments = slug.split('-');
    var districtIndex = segments.findIndex((segment) => ['quan', 'huyen', 'thi-xa', 'thanh-pho'].includes(segment));
    var provinceIndex = segments.findIndex((segment, index) => index > districtIndex && segment === 'tp');

    var district = '';
    var province = '';

    if (districtIndex >= 0) {
      var districtTokens = segments.slice(districtIndex, provinceIndex > districtIndex ? provinceIndex : undefined);
      district = titleCase(slugToWords(districtTokens.join('-')));
    }

    if (provinceIndex >= 0) {
      province = titleCase(slugToWords(segments.slice(provinceIndex).join('-')));
    } else if (districtIndex >= 0) {
      var provinceTokens = segments.slice(districtIndex + 2);
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

var inferVehicleType = function({ title = '', description = '', sourceUrl = '' }) {
  var haystack = normalizeForMatch(`${title} ${description} ${sourceUrl}`);
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

var extractYear = function(title = '', description = '') {
  var match = `${title} ${description}`.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) {
    return undefined;
  }

  var year = Number(match[1]);
  var maxYear = new Date().getFullYear() + 1;
  return year >= 1990 && year <= maxYear ? year : undefined;
};

var extractVehicleBrand = function(title = '') {
  var normalized = normalizeForMatch(title);
  var brands = [
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

  var brand = brands.find((item) => normalized.includes(item));
  return brand ? titleCase(brand) : '';
};

var cleanListingTitle = function(title = '') {
  var cleaned = normalizeWhitespace(
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

var cleanImportedItem = function(item) {
  var sourceTitleMarkup = normalizeWhitespace(item.title || item.attributes?.sourceTitle || 'Imported from Chotot');
  var sourceDescriptionMarkup = normalizeWhitespace(item.description || sourceTitleMarkup || 'Imported from Chotot');
  var titleMarkupInfo = extractMarkupInfo(sourceTitleMarkup, item.sourceUrl);
  var descriptionMarkupInfo = extractMarkupInfo(sourceDescriptionMarkup, item.sourceUrl);
  var directTitle = extractHtmlAttribute(sourceTitleMarkup, 'alt') || extractHtmlAttribute(sourceDescriptionMarkup, 'alt');
  var sourceTitle = normalizeWhitespace(directTitle || titleMarkupInfo.title || stripHtml(sourceTitleMarkup) || 'Imported from Chotot');
  var description = normalizeWhitespace(
    stripHtml(sourceDescriptionMarkup) || sourceTitle || 'Imported from Chotot'
  );
  var title = cleanListingTitle(sourceTitle).substring(0, 200);
  var areaFromText = parseAreaFromText(item.addressText || item.address || '');
  var areaFromTitle = parseAreaFromTitle(sourceTitle);
  var areaFromUrl = parseAreaFromUrl(item.sourceUrl);
  var vehicleType = inferVehicleType({ title: sourceTitle, description, sourceUrl: item.sourceUrl });
  var modelYear = extractYear(sourceTitle, description);
  var vehicleBrand = extractVehicleBrand(sourceTitle);
  var province = areaFromText.province || areaFromTitle.province || areaFromUrl.province;
  var district = areaFromText.district || areaFromTitle.district || areaFromUrl.district;
  var ward = areaFromText.ward || areaFromTitle.ward || cleanWard(item.addressText || item.address || '');
  var normalizedTitle = normalizeWhitespace(
    title
      .replace(/\b(19\d{2}|20\d{2})\b/g, '')
      .replace(/\b(c?n b??n|can ban|ch??nh ch?|chinh chu|bao sang ten|bao sang t??n)\b/giu, '')
  ).substring(0, 200);
  var images = buildImageList(
    item.images,
    item.thumbnailImage,
    titleMarkupInfo.images,
    descriptionMarkupInfo.images,
    item.attributes?.image,
    item.attributes?.thumbnailImage
  );

  return {
    ...item,
    title,
    description: description.substring(0, 5000),
    images,
    thumbnailImage: images[0] || null,
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
      sourceTitle: sourceTitleMarkup,
      normalizedTitle,
      modelYear,
      vehicleType,
      vehicleBrand,
      importedProvince: province,
      importedDistrict: district,
      importedWard: ward,
      rawAddressText: normalizeWhitespace(item.addressText || item.address || ''),
      extractedImage: images[0] || '',
    },
  };
};

var ensureChototImporterUser = async function() {
  var userRole =
    (await Role.findOne({ name: 'user' })) ||
    (await Role.create({
      name: 'user',
      description: 'Standard marketplace account that can buy, sell, bid, order, and chat',
      permissions: ['product:create', 'product:update', 'product:read', 'order:create', 'order:read', 'bid:create', 'auction:create', 'chat:create', 'chat:read'],
    }));

  var user = await User.findOne({ email: 'chotot-importer@example.com' });
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

var ensureCategory = async function(categoryName) {
  var name = categoryName || 'Chotot';
  var slug = slugify(name);

  var category = await Category.findOne({ slug });
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

var parseXeCards = function($, categoryUrl, categoryName) {
  var products = [];

  $('div.ads-card-grid').each((_, element) => {
    var card = $(element);
    var anchor = card.find('a[href]').first();
    var sourceUrl = normalizeUrl(anchor.attr('href'), categoryUrl);
    var rawTitle = normalizeWhitespace(
      card.find('[class*="adItemTitle"], [class*="title"]').first().text() ||
      anchor.attr('title') ||
      card.find('img').first().attr('alt') ||
      extractMarkupInfo(anchor.html() || card.html() || '', sourceUrl || categoryUrl).title ||
      anchor.text().trim()
    );
    var description = rawTitle || 'Imported from Chotot';
    var price = extractPrice(card.find('p.price').first().text().trim() || card.text());
    var images = buildImageList(
      collectImageUrls($, card, sourceUrl || categoryUrl),
      extractMarkupInfo(card.html() || '', sourceUrl || categoryUrl).images
    );
    var address =
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
        images,
        source: 'chotot',
        sourceUrl,
        sourceExternalId: buildExternalId({ sourceUrl, title: rawTitle, address }),
      });
    }
  });

  return products;
};

var parseGenericCards = function($, categoryUrl, categoryName) {
  var products = [];
  var cards = $('div[id^="listing_item_"], article, li').toArray();

  cards.forEach((element) => {
    var card = $(element);
    var anchor = card.find('a[href]').first();
    var title = normalizeWhitespace(
      card.find('[class*="title"]').first().text() ||
      anchor.attr('title') ||
      card.find('img').first().attr('alt') ||
      extractMarkupInfo(anchor.html() || card.html() || '', categoryUrl).title ||
      anchor.text().trim()
    );
    var rawPrice =
      card.find('[class*="price"]').first().text().trim() ||
      card.text().match(/d[d., ]{2,}/)?.[0] ||
      '';
    var price = extractPrice(rawPrice);
    var description =
      card.find('[class*="description"], [class*="body"]').first().text().trim() || title;
    var address =
      card.find('[class*="location"], [class*="region"]').first().text().trim() || '';
    var images = buildImageList(
      collectImageUrls($, card, categoryUrl),
      extractMarkupInfo(card.html() || '', categoryUrl).images
    );
    var sourceUrl = normalizeUrl(anchor.attr('href'), categoryUrl);

    if (title && price > 0) {
      products.push({
        title: title.substring(0, 400),
        description: (description || 'Imported from Chotot').substring(0, 5000),
        price,
        categoryName,
        addressText: address,
        images,
        source: 'chotot',
        sourceUrl,
        sourceExternalId: buildExternalId({ sourceUrl, title, address }),
      });
    }
  });

  return products;
};

var scrapeChototProducts = async function(categoryUrl, categoryName, maxPages = 1) {
  var products = [];

  for (var page = 1; page <= maxPages; page += 1) {
    var url = categoryUrl.includes('?') ? `${categoryUrl}&page=${page}` : `${categoryUrl}?page=${page}`;
    var response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 20000,
    });

    var $ = cheerio.load(response.data);
    var pageProducts = categoryUrl.includes('xe.chotot.com')
      ? parseXeCards($, categoryUrl, categoryName)
      : parseGenericCards($, categoryUrl, categoryName);

    products.push(...pageProducts.map(cleanImportedItem));

    if (page < maxPages) {
      await delay(1500);
    }
  }

  return products;
};

var scrapeChototApi = async function(keyword, limit = 20) {
  var response = await axios.get('https://www.chotot.com/api/v2/ent/search', {
    headers: getHeaders(),
    params: {
      q: keyword,
      limit,
    },
    timeout: 20000,
  });

  var listings = response.data?.listings || [];
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

var importChototProducts = async function(
  scrapedData,
  { sourceCategory = 'general', query = '', sourceUrl = '', createdBy = null } = {}
) {
  var seller = await ensureChototImporterUser();
  var batch = await ImportBatch.create({
    source: 'chotot',
    sourceCategory,
    query,
    sourceUrl,
    status: 'running',
    startedAt: new Date(),
    createdBy,
  });

  var totalInserted = 0;
  var totalUpdated = 0;
  var totalSkipped = 0;

  for (var item of scrapedData) {
    try {
      if (!item.title || !item.price) {
        totalSkipped += 1;
        continue;
      }

      var category = await ensureCategory(item.categoryName || sourceCategory);
      var sourceExternalId = buildExternalId(item);
      var filter = sourceExternalId
        ? { source: 'chotot', sourceExternalId }
        : { source: 'chotot', sourceUrl: item.sourceUrl };

      var existing = await Product.findOne(filter);
      var payload = {
        seller: seller._id,
        category: category._id,
        title: item.title,
        description: item.description || 'Imported from Chotot',
        price: Math.max(item.price || 0, 0),
        saleType: item.saleType || 'fixed_price',
        condition: item.condition || 'good',
        status: item.status || 'active',
        fulfillmentType: item.fulfillmentType || 'both',        images: item.images?.length ? item.images : existing?.images || [],
        thumbnailImage: item.thumbnailImage || item.images?.[0] || existing?.thumbnailImage || existing?.images?.[0] || null,
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

      var product = await Product.findOneAndUpdate(
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

var importFromChotot = async function({
  categoryUrl,
  categoryName,
  maxPages = 1,
  keyword,
  mode = 'html',
  createdBy = null,
} = {}) {
  var scrapedData =
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






