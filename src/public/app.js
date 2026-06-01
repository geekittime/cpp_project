const state = {
  templates: [],
  projects: [],
  selectedProjectId: null,
  selectedTemplateId: null,
  selectedReportId: null,
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  bootstrap();
});

function cacheElements() {
  elements.feedback = document.getElementById('feedback');
  elements.healthPill = document.getElementById('health-pill');
  elements.projectCount = document.getElementById('project-count');
  elements.projectList = document.getElementById('project-list');
  elements.projectForm = document.getElementById('project-form');
  elements.projectTemplate = document.getElementById('project-template');
  elements.projectName = document.getElementById('project-name');
  elements.projectUrl = document.getElementById('project-url');
  elements.refreshButton = document.getElementById('refresh-button');
  elements.detailTitle = document.getElementById('detail-title');
  elements.detailSummary = document.getElementById('detail-summary');
  elements.runAuditButton = document.getElementById('run-audit-button');
  elements.checklistList = document.getElementById('checklist-list');
  elements.reportList = document.getElementById('report-list');
  elements.templateList = document.getElementById('template-list');
  elements.templateEditorTitle = document.getElementById('template-editor-title');
  elements.templateForm = document.getElementById('template-form');
  elements.templateName = document.getElementById('template-name');
  elements.templateItems = document.getElementById('template-items');
  elements.saveTemplateButton = document.getElementById('save-template-button');
  elements.deleteTemplateButton = document.getElementById('delete-template-button');
}

function bindEvents() {
  elements.refreshButton.addEventListener('click', () => bootstrap());
  elements.projectForm.addEventListener('submit', handleProjectCreate);
  elements.runAuditButton.addEventListener('click', handleRunAudit);
  elements.templateForm.addEventListener('submit', handleTemplateSave);
  elements.deleteTemplateButton.addEventListener('click', handleTemplateDelete);
}

async function bootstrap() {
  setFeedback('Loading dashboard data...');
  await Promise.allSettled([checkHealth(), loadTemplates(), loadProjects()]);
  await render();
  setFeedback('Dashboard ready.');
}

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body !== undefined && typeof body !== 'string') {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(path, { ...options, headers, body });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || 'Request failed.',
    );
    error.status = response.status;
    error.code = payload?.error?.code || 'request_failed';
    error.details = payload?.error?.details || {};
    throw error;
  }

  return payload;
}

async function checkHealth() {
  try {
    const payload = await apiRequest('/api/health');
    if (payload.status === 'ok') {
      elements.healthPill.textContent = 'API healthy';
      elements.healthPill.className = 'pill pill-ok';
    }
  } catch (error) {
    elements.healthPill.textContent = 'API unavailable';
    elements.healthPill.className = 'pill pill-error';
    setFeedback(`${error.message} (${error.code})`);
  }
}

async function loadProjects() {
  const payload = await apiRequest('/api/projects');
  state.projects = payload.projects;

  if (
    state.selectedProjectId
    && !state.projects.some((project) => project.id === state.selectedProjectId)
  ) {
    state.selectedProjectId = null;
    state.selectedReportId = null;
  }

  if (!state.selectedProjectId && state.projects.length > 0) {
    state.selectedProjectId = state.projects[0].id;
  }
}

async function loadTemplates() {
  const payload = await apiRequest('/api/templates');
  state.templates = payload.templates;

  if (
    state.selectedTemplateId
    && !state.templates.some((template) => template.id === state.selectedTemplateId)
  ) {
    state.selectedTemplateId = null;
  }
}

async function render() {
  renderProjectFormOptions();
  renderProjects();
  renderTemplates();
  await renderSelectedProject();
  await renderTemplateEditor();
}

function renderProjectFormOptions() {
  const previous = elements.projectTemplate.value;
  elements.projectTemplate.innerHTML = '';

  for (const template of state.templates) {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = `${template.name} (${template.item_count} items)`;
    elements.projectTemplate.append(option);
  }

  if (previous && state.templates.some((template) => template.id === previous)) {
    elements.projectTemplate.value = previous;
  }
}

function renderProjects() {
  elements.projectCount.textContent = `${state.projects.length} project${state.projects.length === 1 ? '' : 's'}`;
  elements.projectList.innerHTML = '';

  if (state.projects.length === 0) {
    elements.projectList.className = 'card-grid empty-state';
    elements.projectList.textContent = 'No projects yet.';
    return;
  }

  elements.projectList.className = 'card-grid';
  for (const project of state.projects) {
    const card = document.createElement('article');
    card.className = 'project-card';
    const latest = project.latest_report;
    const statusClass = latest ? `status-${latest.status}` : 'status-pending';
    card.innerHTML = `
      <header>
        <div>
          <h4>${escapeHtml(project.name)}</h4>
          <p class="muted small">${escapeHtml(project.repo_owner)}/${escapeHtml(project.repo_name)}</p>
        </div>
        <span class="status ${statusClass}">
          ${latest ? `${latest.status} ${latest.score}%` : 'No audit yet'}
        </span>
      </header>
      <div class="meta-row muted small">
        <span>${escapeHtml(project.template.name)}</span>
        <span>${latest ? `Updated ${formatDate(latest.created_at)}` : 'Awaiting first audit'}</span>
      </div>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary';
    button.textContent = state.selectedProjectId === project.id ? 'Selected' : 'Open project';
    button.disabled = state.selectedProjectId === project.id;
    button.addEventListener('click', () => {
      state.selectedProjectId = project.id;
      state.selectedReportId = latest ? latest.id : null;
      renderSelectedProject().catch(handleUnexpectedError);
      renderProjects();
    });
    card.append(button);
    elements.projectList.append(card);
  }
}

async function renderSelectedProject() {
  const selectedProject = state.projects.find((project) => project.id === state.selectedProjectId);
  elements.checklistList.innerHTML = '';
  elements.reportList.innerHTML = '';

  if (!selectedProject) {
    elements.detailTitle.textContent = 'Select a project';
    elements.detailSummary.textContent = 'Choose a project to inspect checklist results, manual evidence, and report history.';
    elements.runAuditButton.disabled = true;
    return;
  }

  elements.detailTitle.textContent = selectedProject.name;
  elements.runAuditButton.disabled = false;
  elements.detailSummary.innerHTML = `
    <div class="meta-row">
      <span class="badge">${escapeHtml(selectedProject.repo_url)}</span>
      <span class="badge">${escapeHtml(selectedProject.template.name)}</span>
      <span class="badge">${selectedProject.latest_report ? `${selectedProject.latest_report.score}%` : 'No score yet'}</span>
    </div>
  `;

  const [projectPayload, reportsPayload] = await Promise.all([
    apiRequest(`/api/projects/${selectedProject.id}`),
    apiRequest(`/api/projects/${selectedProject.id}/reports`),
  ]);
  const reports = reportsPayload.reports;
  const selectedReport = chooseSelectedReport(reports);

  if (!selectedReport) {
    elements.checklistList.innerHTML = '<div class="empty-state muted">Run the first audit to see checklist results.</div>';
    elements.reportList.innerHTML = '<div class="empty-state muted">No report snapshots yet.</div>';
    return;
  }

  const reportPayload = await apiRequest(
    `/api/projects/${selectedProject.id}/reports/${selectedReport.id}`,
  );
  renderChecklist(reportPayload.report, projectPayload.project);
  renderReports(reports);
}

function chooseSelectedReport(reports) {
  if (reports.length === 0) {
    state.selectedReportId = null;
    return null;
  }

  const existing = reports.find((report) => report.id === state.selectedReportId);
  if (existing) {
    return existing;
  }

  state.selectedReportId = reports[0].id;
  return reports[0];
}

function renderChecklist(report, project) {
  const warnings = report.warnings && report.warnings.length > 0
    ? `<div class="pill pill-neutral">${report.warnings.join(' | ')}</div>`
    : '';
  elements.checklistList.innerHTML = `
    <div class="report-item">
      <header>
        <div>
          <h4>Latest snapshot</h4>
          <p class="muted small">${formatDate(report.generated_at)} for ${escapeHtml(project.repo_owner)}/${escapeHtml(project.repo_name)}</p>
        </div>
        <span class="status status-${report.status}">${report.status} ${report.score}%</span>
      </header>
      <div class="meta-row">
        <span class="badge">Passed ${report.counts.passed}/${report.counts.total}</span>
        <span class="badge">Failed ${report.counts.failed}</span>
        <span class="badge">Pending ${report.counts.pending}</span>
      </div>
      ${warnings}
    </div>
  `;

  for (const item of report.items) {
    const article = document.createElement('article');
    article.className = 'check-item';
    article.innerHTML = `
      <header>
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <p class="muted small">${escapeHtml(item.description)}</p>
        </div>
        <div class="inline-actions">
          <span class="status status-${item.status}">${item.status}</span>
          <span class="status ${item.severity === 'blocking' ? 'status-failed' : 'status-advisory'}">${item.severity}</span>
        </div>
      </header>
      <p class="muted small">${escapeHtml(item.detail || '')}</p>
    `;

    if (item.kind === 'manual') {
      article.append(createEvidenceForm(project.id, item));
    }

    elements.checklistList.append(article);
  }
}

function createEvidenceForm(projectId, item) {
  const form = document.createElement('form');
  form.className = 'stack';
  form.innerHTML = `
    <label class="field">
      <span>Evidence text</span>
      <textarea name="text" rows="3" placeholder="What proves this item is complete?">${escapeHtml(item.evidence?.text || '')}</textarea>
    </label>
    <label class="field">
      <span>Evidence URL</span>
      <input name="url" type="url" placeholder="https://example.com/proof" value="${escapeHtml(item.evidence?.url || '')}">
    </label>
    <label class="field">
      <span>
        <input name="completed" type="checkbox" ${item.evidence?.completed ? 'checked' : ''}>
        Mark as complete
      </span>
    </label>
    <button class="button secondary" type="submit">Save evidence</button>
  `;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await apiRequest(`/api/projects/${projectId}/evidence/${item.key}`, {
        method: 'PUT',
        body: {
          text: formData.get('text'),
          url: formData.get('url'),
          completed: formData.get('completed') === 'on',
        },
      });
      setFeedback(`Saved evidence for "${item.title}".`);
      await loadProjects();
      await renderSelectedProject();
      renderProjects();
    } catch (error) {
      setFeedback(`${error.message} (${error.code})`);
    }
  });

  return form;
}

function renderReports(reports) {
  elements.reportList.innerHTML = '<h4>Report history</h4>';
  for (const report of reports) {
    const article = document.createElement('article');
    article.className = 'report-item';
    article.innerHTML = `
      <header>
        <div>
          <h4>${formatDate(report.created_at)}</h4>
          <p class="muted small">Immutable snapshot</p>
        </div>
        <span class="status status-${report.status}">${report.status} ${report.score}%</span>
      </header>
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary';
    button.textContent = state.selectedReportId === report.id ? 'Viewing' : 'View snapshot';
    button.disabled = state.selectedReportId === report.id;
    button.addEventListener('click', async () => {
      state.selectedReportId = report.id;
      await renderSelectedProject();
    });
    article.append(button);
    elements.reportList.append(article);
  }
}

function renderTemplates() {
  elements.templateList.innerHTML = '';
  if (state.templates.length === 0) {
    elements.templateList.className = 'stack empty-state';
    elements.templateList.textContent = 'No templates available.';
    return;
  }

  elements.templateList.className = 'stack';
  for (const template of state.templates) {
    const card = document.createElement('article');
    card.className = 'template-card';
    card.innerHTML = `
      <header>
        <div>
          <h4>${escapeHtml(template.name)}</h4>
          <p class="muted small">${template.item_count} items</p>
        </div>
        <span class="status ${template.is_builtin ? 'status-advisory' : 'status-pending'}">
          ${template.is_builtin ? 'Built-in' : 'Custom'}
        </span>
      </header>
    `;

    const actions = document.createElement('div');
    actions.className = 'button-row';

    const inspectButton = document.createElement('button');
    inspectButton.type = 'button';
    inspectButton.className = 'button secondary';
    inspectButton.textContent = 'Inspect';
    inspectButton.addEventListener('click', async () => {
      state.selectedTemplateId = template.id;
      await renderTemplateEditor();
    });
    actions.append(inspectButton);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'button secondary';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', async () => {
      try {
        const payload = await apiRequest(`/api/templates/${template.id}/copy`, {
          method: 'POST',
          body: { name: `${template.name} Copy` },
        });
        state.selectedTemplateId = payload.template.id;
        await loadTemplates();
        await render();
        setFeedback(`Copied template "${template.name}".`);
      } catch (error) {
        setFeedback(`${error.message} (${error.code})`);
      }
    });
    actions.append(copyButton);

    card.append(actions);
    elements.templateList.append(card);
  }
}

async function renderTemplateEditor() {
  const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
  if (!selectedTemplate) {
    elements.templateEditorTitle.textContent = 'Select a custom template';
    elements.templateName.value = '';
    elements.templateItems.value = '';
    elements.templateName.disabled = true;
    elements.templateItems.disabled = true;
    elements.saveTemplateButton.disabled = true;
    elements.deleteTemplateButton.disabled = true;
    return;
  }

  const payload = await apiRequest(`/api/templates/${selectedTemplate.id}`);
  const template = payload.template;
  const editable = !template.is_builtin;
  elements.templateEditorTitle.textContent = template.name;
  elements.templateName.value = template.name;
  elements.templateItems.value = JSON.stringify(
    template.items.map(({ position, ...item }) => item),
    null,
    2,
  );
  elements.templateName.disabled = !editable;
  elements.templateItems.disabled = !editable;
  elements.saveTemplateButton.disabled = !editable;
  elements.deleteTemplateButton.disabled = !editable;
}

async function handleProjectCreate(event) {
  event.preventDefault();
  try {
    await apiRequest('/api/projects', {
      method: 'POST',
      body: {
        name: elements.projectName.value,
        repo_url: elements.projectUrl.value,
        template_id: elements.projectTemplate.value,
      },
    });
    elements.projectForm.reset();
    await loadProjects();
    await render();
    setFeedback('Project created.');
  } catch (error) {
    setFeedback(`${error.message} (${error.code})`);
  }
}

async function handleRunAudit() {
  if (!state.selectedProjectId) {
    return;
  }

  setFeedback('Running audit...');
  try {
    const payload = await apiRequest(`/api/projects/${state.selectedProjectId}/audits`, {
      method: 'POST',
    });
    state.selectedReportId = payload.report.id;
    await loadProjects();
    await render();
    setFeedback(`Audit completed with ${payload.report.score}% readiness.`);
  } catch (error) {
    setFeedback(`${error.message} (${error.code})`);
  }
}

async function handleTemplateSave(event) {
  event.preventDefault();
  if (!state.selectedTemplateId) {
    return;
  }

  try {
    await apiRequest(`/api/templates/${state.selectedTemplateId}`, {
      method: 'PUT',
      body: {
        name: elements.templateName.value,
        items: JSON.parse(elements.templateItems.value),
      },
    });
    await loadTemplates();
    await render();
    setFeedback('Template saved.');
  } catch (error) {
    setFeedback(`${error.message} (${error.code})`);
  }
}

async function handleTemplateDelete() {
  if (!state.selectedTemplateId) {
    return;
  }

  try {
    await apiRequest(`/api/templates/${state.selectedTemplateId}`, {
      method: 'DELETE',
    });
    state.selectedTemplateId = null;
    await loadTemplates();
    await render();
    setFeedback('Template deleted.');
  } catch (error) {
    setFeedback(`${error.message} (${error.code})`);
  }
}

function setFeedback(message) {
  elements.feedback.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function handleUnexpectedError(error) {
  setFeedback(`${error.message || 'Unexpected error.'} (${error.code || 'unexpected'})`);
}
