import type { SwaggerUiOptions } from 'swagger-ui-express';

export const swaggerCustomCss = `
:root {
  --tm-bg: #f7f5fc;
  --tm-surface: #ffffff;
  --tm-surface-alt: #f1edfa;
  --tm-border: #e2dcf2;
  --tm-text: #2a2440;
  --tm-text-muted: #6b6485;
  --tm-primary: #7c5cd6;
  --tm-primary-strong: #6342c4;
  --tm-primary-soft: #ece6fb;
  --tm-header-from: #6d4fd0;
  --tm-header-to: #a48be8;
  --tm-header-text: #ffffff;
  --tm-input-bg: #ffffff;
  --tm-shadow: 0 1px 3px rgba(60, 40, 120, 0.08), 0 4px 14px rgba(60, 40, 120, 0.05);

  --tm-get: #3b82c4;      --tm-get-bg: #eef5fc;
  --tm-post: #2f9e74;     --tm-post-bg: #edf8f3;
  --tm-put: #c98a1b;      --tm-put-bg: #fdf6ea;
  --tm-patch: #8b5cf6;    --tm-patch-bg: #f4effe;
  --tm-delete: #d0567a;   --tm-delete-bg: #fcf0f4;

  --tm-radius: 10px;
  --tm-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --tm-mono: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --tm-bg: #15121f;
    --tm-surface: #1e1a2c;
    --tm-surface-alt: #262138;
    --tm-border: #3a3354;
    --tm-text: #e9e5f5;
    --tm-text-muted: #a69fc0;
    --tm-primary: #a78bfa;
    --tm-primary-strong: #c4b5fd;
    --tm-primary-soft: #2e2747;
    --tm-header-from: #3b2a78;
    --tm-header-to: #5b45a8;
    --tm-input-bg: #15121f;
    --tm-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);

    --tm-get: #7cb4e8;      --tm-get-bg: #1b2433;
    --tm-post: #6fcfa6;     --tm-post-bg: #1a2a26;
    --tm-put: #e6b45e;      --tm-put-bg: #2d2619;
    --tm-patch: #b79cf8;    --tm-patch-bg: #262040;
    --tm-delete: #ec8fab;   --tm-delete-bg: #301c26;
  }
}

body { background: var(--tm-bg); color: var(--tm-text); }
.swagger-ui, .swagger-ui .info .title, .swagger-ui .opblock-tag,
.swagger-ui .btn, .swagger-ui input, .swagger-ui select, .swagger-ui textarea,
.swagger-ui .model-title, .swagger-ui table thead tr th, .swagger-ui .parameter__name,
.swagger-ui .response-col_status, .swagger-ui .tab li, .swagger-ui label {
  font-family: var(--tm-font);
}
.swagger-ui, .swagger-ui p, .swagger-ui li, .swagger-ui td, .swagger-ui th, .swagger-ui label,
.swagger-ui h1, .swagger-ui h2, .swagger-ui h3, .swagger-ui h4, .swagger-ui h5,
.swagger-ui .info .title, .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table,
.swagger-ui .opblock-tag, .swagger-ui .opblock .opblock-summary-path,
.swagger-ui .opblock .opblock-summary-description, .swagger-ui .opblock-description-wrapper p,
.swagger-ui .opblock .opblock-section-header h4, .swagger-ui .opblock .opblock-section-header label,
.swagger-ui .parameter__name, .swagger-ui .parameter__type, .swagger-ui .parameter__in,
.swagger-ui .response-col_status, .swagger-ui .response-col_links, .swagger-ui .tab li,
.swagger-ui .model, .swagger-ui .model-title, .swagger-ui .prop-type, .swagger-ui .prop-format,
.swagger-ui table thead tr th, .swagger-ui table thead tr td, .swagger-ui .responses-inner h4,
.swagger-ui .responses-inner h5, .swagger-ui .scheme-container .schemes > label,
.swagger-ui .servers-title, .swagger-ui .servers > label, .swagger-ui .loading-container .loading::after,
.swagger-ui .dialog-ux .modal-ux-header h3, .swagger-ui .dialog-ux .modal-ux-content p,
.swagger-ui .dialog-ux .modal-ux-content h4, .swagger-ui section.models h4,
.swagger-ui .model-box-control, .swagger-ui .models-control, .swagger-ui .renderedMarkdown p {
  color: var(--tm-text);
}
.swagger-ui .opblock .opblock-summary-description, .swagger-ui .parameter__in,
.swagger-ui .prop-format, .swagger-ui .parameter__type { color: var(--tm-text-muted); }
.swagger-ui a, .swagger-ui .info a { color: var(--tm-primary); }
.swagger-ui a:hover { color: var(--tm-primary-strong); }
.swagger-ui svg:not(:root) { fill: currentColor; }
.swagger-ui .arrow, .swagger-ui .expand-operation svg, .swagger-ui .models-control svg,
.swagger-ui .model-toggle::after { fill: var(--tm-text-muted); }
.swagger-ui .wrapper { max-width: 1180px; padding: 0 24px; }

.swagger-ui .topbar { display: none; }
#swagger-ui::before, .swagger-ui.swagger-container::before {
  display: block;
  background: linear-gradient(120deg, var(--tm-header-from), var(--tm-header-to));
  color: var(--tm-header-text);
  font-family: var(--tm-font);
  text-align: center;
}
#swagger-ui::before {
  content: "Task Manager API";
  padding: 36px 24px 6px;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.swagger-ui.swagger-container::before {
  content: "Gestión de tareas personales con autenticación JWT · Node.js, Express, TypeScript y PostgreSQL";
  padding: 0 24px 32px;
  font-size: 15px;
  opacity: 0.92;
}

.swagger-ui .info { margin: 36px 0 24px; }
.swagger-ui .info .title small { background: var(--tm-primary-soft); border-radius: 999px; padding: 3px 10px; }
.swagger-ui .info .title small pre { color: var(--tm-primary-strong); font-family: var(--tm-mono); }
.swagger-ui .info .title small.version-stamp { background: var(--tm-primary); }
.swagger-ui .info .title small.version-stamp pre { color: #fff; }
.swagger-ui .info code, .swagger-ui .markdown code, .swagger-ui .renderedMarkdown code {
  background: var(--tm-primary-soft); color: var(--tm-primary-strong);
  border-radius: 6px; padding: 1px 6px; font-family: var(--tm-mono);
}
.swagger-ui .scheme-container {
  background: var(--tm-surface); border: 1px solid var(--tm-border);
  border-radius: var(--tm-radius); box-shadow: var(--tm-shadow);
  margin: 0 auto 28px; max-width: 1132px; padding: 18px 0;
}

.swagger-ui .btn {
  border-radius: 8px; border: 1px solid var(--tm-border); box-shadow: none;
  background: var(--tm-surface); color: var(--tm-text); transition: background .15s, border-color .15s;
}
.swagger-ui .btn:hover { border-color: var(--tm-primary); box-shadow: none; }
.swagger-ui .btn.authorize, .swagger-ui .btn.authorize span { color: var(--tm-primary-strong); border-color: var(--tm-primary); }
.swagger-ui .btn.authorize svg { fill: var(--tm-primary-strong); }
.swagger-ui .btn.execute { background: var(--tm-primary); border-color: var(--tm-primary); color: #fff; }
.swagger-ui .btn.execute:hover { background: var(--tm-primary-strong); }
.swagger-ui .btn.cancel { color: var(--tm-delete); border-color: var(--tm-delete); }
.swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=search],
.swagger-ui input[type=email], .swagger-ui input[type=file], .swagger-ui textarea, .swagger-ui select {
  background: var(--tm-input-bg); color: var(--tm-text);
  border: 1px solid var(--tm-border); border-radius: 8px; box-shadow: none;
}
.swagger-ui input:focus, .swagger-ui textarea:focus, .swagger-ui select:focus {
  outline: 2px solid var(--tm-primary); outline-offset: 1px;
}
.swagger-ui .filter-container .operation-filter-input { margin: 8px 0 20px; padding: 10px 14px; }
.swagger-ui textarea { font-family: var(--tm-mono); }

.swagger-ui .opblock-tag { border-bottom: 1px solid var(--tm-border); font-size: 20px; padding: 12px 4px; }
.swagger-ui .opblock-tag:hover { background: transparent; }
.swagger-ui .opblock-tag small { color: var(--tm-text-muted); }
.swagger-ui .opblock-tag-section { margin-bottom: 12px; }

.swagger-ui .opblock {
  border-radius: var(--tm-radius); border-width: 1px; box-shadow: var(--tm-shadow);
  margin: 0 0 12px; overflow: hidden;
}
.swagger-ui .opblock .opblock-summary { border: 0; padding: 8px 12px; }
.swagger-ui .opblock .opblock-summary-method {
  border-radius: 6px; min-width: 76px; padding: 7px 0;
  font-family: var(--tm-font); font-weight: 700; letter-spacing: 0.04em; text-shadow: none;
}
.swagger-ui .opblock .opblock-summary-path { font-family: var(--tm-mono); font-weight: 600; }
.swagger-ui .opblock .opblock-section-header {
  background: var(--tm-surface-alt); box-shadow: none; border-top: 1px solid var(--tm-border);
}
.swagger-ui .opblock-body, .swagger-ui .opblock .opblock-body .opblock-section { background: var(--tm-surface); }
.swagger-ui .opblock-body pre.microlight, .swagger-ui .highlight-code > .microlight {
  border-radius: 8px; font-family: var(--tm-mono);
}
.swagger-ui .opblock.opblock-deprecated { opacity: 0.7; }

.swagger-ui .opblock.opblock-get { background: var(--tm-get-bg); border-color: var(--tm-get); }
.swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--tm-get); }
.swagger-ui .opblock.opblock-get .tab-header .tab-item.active h4 span::after { background: var(--tm-get); }

.swagger-ui .opblock.opblock-post { background: var(--tm-post-bg); border-color: var(--tm-post); }
.swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--tm-post); }
.swagger-ui .opblock.opblock-post .tab-header .tab-item.active h4 span::after { background: var(--tm-post); }

.swagger-ui .opblock.opblock-put { background: var(--tm-put-bg); border-color: var(--tm-put); }
.swagger-ui .opblock.opblock-put .opblock-summary-method { background: var(--tm-put); }
.swagger-ui .opblock.opblock-put .tab-header .tab-item.active h4 span::after { background: var(--tm-put); }

.swagger-ui .opblock.opblock-patch { background: var(--tm-patch-bg); border-color: var(--tm-patch); }
.swagger-ui .opblock.opblock-patch .opblock-summary-method { background: var(--tm-patch); }
.swagger-ui .opblock.opblock-patch .tab-header .tab-item.active h4 span::after { background: var(--tm-patch); }

.swagger-ui .opblock.opblock-delete { background: var(--tm-delete-bg); border-color: var(--tm-delete); }
.swagger-ui .opblock.opblock-delete .opblock-summary-method { background: var(--tm-delete); }
.swagger-ui .opblock.opblock-delete .tab-header .tab-item.active h4 span::after { background: var(--tm-delete); }

@media (prefers-color-scheme: dark) {
  .swagger-ui .opblock .opblock-summary-method { color: #15121f; }
}

.swagger-ui table thead tr th, .swagger-ui table thead tr td { border-bottom: 1px solid var(--tm-border); }
.swagger-ui .responses-inner { padding: 16px 20px; }
.swagger-ui .response-control-media-type__accept-message { color: var(--tm-post); }
.swagger-ui .request-duration { color: var(--tm-text-muted); }
.swagger-ui section.models {
  border: 1px solid var(--tm-border); border-radius: var(--tm-radius);
  background: var(--tm-surface); box-shadow: var(--tm-shadow);
}
.swagger-ui section.models.is-open h4 { border-bottom: 1px solid var(--tm-border); }
.swagger-ui section.models .model-container {
  background: var(--tm-surface-alt); border-radius: 8px;
}
.swagger-ui section.models .model-container:hover { background: var(--tm-primary-soft); }
.swagger-ui .model-box { background: transparent; }
.swagger-ui .model .property.primitive, .swagger-ui .model span { color: var(--tm-text-muted); }
.swagger-ui .prop-type { color: var(--tm-primary); }
.swagger-ui .parameter__name.required::after, .swagger-ui .parameter__name.required span { color: var(--tm-delete); }

.swagger-ui .dialog-ux .backdrop-ux { background: rgba(20, 14, 40, 0.55); }
.swagger-ui .dialog-ux .modal-ux {
  background: var(--tm-surface); border: 1px solid var(--tm-border);
  border-radius: 14px; box-shadow: 0 20px 50px rgba(20, 14, 40, 0.35);
}
.swagger-ui .dialog-ux .modal-ux-header { border-bottom: 1px solid var(--tm-border); }
.swagger-ui .dialog-ux .modal-ux-header .close-modal svg { fill: var(--tm-text-muted); }
.swagger-ui .auth-container { border-bottom: 1px solid var(--tm-border); }
`;

export const swaggerUiOptions: SwaggerUiOptions = {
  customSiteTitle: 'Task Manager API · Docs',
  customCss: swaggerCustomCss,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    tryItOutEnabled: true,
  },
};
