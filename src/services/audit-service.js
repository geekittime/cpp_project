const { createReportSnapshot } = require('../domain/report');
const { evaluateRule } = require('../domain/rules');

class AuditService {
  constructor({
    projectRepository,
    templateRepository,
    evidenceRepository,
    reportRepository,
    githubClient,
    logger = console,
  }) {
    this.projectRepository = projectRepository;
    this.templateRepository = templateRepository;
    this.evidenceRepository = evidenceRepository;
    this.reportRepository = reportRepository;
    this.githubClient = githubClient;
    this.logger = logger;
  }

  async run(projectId) {
    const project = this.projectRepository.get(projectId);
    const template = this.templateRepository.get(project.template.id);
    const evidenceByKey = new Map(
      this.evidenceRepository.listByProject(projectId).map((item) => [item.item_key, item]),
    );
    const snapshot = await this.githubClient.getRepositorySnapshot(
      project.repo_owner,
      project.repo_name,
    );

    const items = template.items.map((item) => {
      if (item.kind === 'automated') {
        const evaluation = evaluateRule(item.rule, snapshot);
        return {
          key: item.key,
          title: item.title,
          description: item.description,
          kind: item.kind,
          severity: item.severity,
          status: evaluation.status,
          detail: evaluation.detail,
        };
      }

      const evidence = evidenceByKey.get(item.key) ?? null;
      return {
        key: item.key,
        title: item.title,
        description: item.description,
        kind: item.kind,
        severity: item.severity,
        status: evidence?.completed ? 'passed' : 'pending',
        detail: evidence?.completed
          ? 'Manual evidence recorded.'
          : 'Manual evidence is still required.',
        evidence,
      };
    });

    const report = createReportSnapshot({
      items,
      github: snapshot.metadata,
      warnings: snapshot.warnings,
    });

    const storedReport = this.reportRepository.create(projectId, report);
    this.logger.info(JSON.stringify({
      event: 'audit_completed',
      project_id: projectId,
      repo_owner: project.repo_owner,
      repo_name: project.repo_name,
      status: storedReport.status,
      score: storedReport.score,
      warning_count: storedReport.warnings.length,
    }));
    return storedReport;
  }
}

module.exports = {
  AuditService,
};
