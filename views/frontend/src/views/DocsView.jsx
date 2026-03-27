import SectionCard from '../components/SectionCard';

const DocsView = () => (
  <div className="view-grid">
    <SectionCard title="Docs va demo assets" subtitle="OpenAPI + Postman + man hinh cu" className="wide">
      <div className="actions-row wrap">
        <a href="/docs.html" target="_blank" rel="noreferrer">Docs Explorer</a>
        <a href="/api-docs/openapi.json" target="_blank" rel="noreferrer">OpenAPI JSON</a>
        <a href="/api-docs/postman_collection.json" target="_blank" rel="noreferrer">Postman Collection</a>
        <a href="/legacy-marketplace" target="_blank" rel="noreferrer">Marketplace HTML cu</a>
        <a href="/admin.html" target="_blank" rel="noreferrer">Admin HTML cu</a>
      </div>
      <p className="muted">Frontend React hien tai da duoc route theo tung trang rieng, va van giu lai cac man hinh HTML cu de doi chieu khi demo.</p>
    </SectionCard>
  </div>
);

export default DocsView;
