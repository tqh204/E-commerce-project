import SectionCard from '../components/SectionCard';
import AppLink from '../components/AppLink';

const DocsView = () => (
  <div className="view-grid">
    <SectionCard title={'T\u00e0i li\u1ec7u API'} subtitle={'OpenAPI, Postman v\u00e0 t\u00e0i nguy\u00ean t\u00edch h\u1ee3p'} className="wide">
      <div className="actions-row wrap">
        <a href="/api-docs/openapi.json" target="_blank" rel="noreferrer">OpenAPI JSON</a>
        <a href="/api-docs/postman_collection.json" target="_blank" rel="noreferrer">Postman Collection</a>
        <AppLink to="/docs" className="route-pill route-pill--button">{'Xem trong \u1ee9ng d\u1ee5ng'}</AppLink>
      </div>
      <p className="muted">{'Frontend React hi\u1ec7n t\u1ea1i \u0111\u00e3 \u0111\u01b0\u1ee3c route theo t\u1eebng trang ri\u00eang. C\u00e1c t\u00e0i li\u1ec7u ch\u00ednh \u0111\u01b0\u1ee3c gi\u1eef d\u01b0\u1edbi d\u1ea1ng OpenAPI v\u00e0 Postman \u0111\u1ec3 test API.'}</p>
    </SectionCard>
  </div>
);

export default DocsView;
