export default function Panel({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  children,
}) {
  const panelClassName = className ? `panel ${className}` : "panel";

  return (
    <section className={panelClassName}>
      {(eyebrow || title || description || actions) && (
        <header className="panel-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p className="panel-description">{description}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
