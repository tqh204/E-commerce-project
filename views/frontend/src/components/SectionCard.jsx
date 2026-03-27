const SectionCard = ({ title, subtitle, actions = null, className = '', children }) => (
  <section className={`section-card ${className}`.trim()}>
    <div className="section-card__head">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h3>{title}</h3>
      </div>
      {actions ? <div className="section-card__actions">{actions}</div> : null}
    </div>
    <div className="section-card__body">{children}</div>
  </section>
);

export default SectionCard;
