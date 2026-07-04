# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class ContractForgeRegistry(gl.Contract):
    project_name: str
    latest_title: str
    latest_contract_name: str
    latest_verdict: str
    latest_summary: str
    latest_report_hash: str
    latest_blueprint_tags: str
    latest_public_views: str
    latest_public_writes: str
    latest_score: u256
    latest_findings_count: u256
    analysis_count: u256

    def __init__(self):
        self.project_name = 'GenLayer Contract Forge'
        self.latest_title = ''
        self.latest_contract_name = ''
        self.latest_verdict = ''
        self.latest_summary = ''
        self.latest_report_hash = ''
        self.latest_blueprint_tags = ''
        self.latest_public_views = ''
        self.latest_public_writes = ''
        self.latest_score = 0
        self.latest_findings_count = 0
        self.analysis_count = 0

    @gl.public.write
    def register_analysis(
        self,
        title: str,
        contract_name: str,
        score: int,
        verdict: str,
        summary: str,
        report_hash: str,
        blueprint_tags: str,
        public_views: str,
        public_writes: str,
        findings_count: int,
    ) -> str:
        self.latest_title = title
        self.latest_contract_name = contract_name
        self.latest_score = score
        self.latest_verdict = verdict
        self.latest_summary = summary
        self.latest_report_hash = report_hash
        self.latest_blueprint_tags = blueprint_tags
        self.latest_public_views = public_views
        self.latest_public_writes = public_writes
        self.latest_findings_count = findings_count
        self.analysis_count += 1

        return (
            'registered=' + title
            + ';contract=' + contract_name
            + ';score=' + str(score)
            + ';verdict=' + verdict
        )

    @gl.public.view
    def project(self) -> str:
        return self.project_name

    @gl.public.view
    def stats(self) -> str:
        return (
            'analyses=' + str(self.analysis_count)
            + ';score=' + str(self.latest_score)
            + ';verdict=' + self.latest_verdict
            + ';findings=' + str(self.latest_findings_count)
        )

    @gl.public.view
    def latest_record(self) -> str:
        return (
            'title=' + self.latest_title
            + ';contract=' + self.latest_contract_name
            + ';summary=' + self.latest_summary
            + ';report_hash=' + self.latest_report_hash
            + ';views=' + self.latest_public_views
            + ';writes=' + self.latest_public_writes
            + ';tags=' + self.latest_blueprint_tags
        )
