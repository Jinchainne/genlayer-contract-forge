# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class OccupancyRegistry(gl.Contract):
    project_name: str
    latest_title: str
    latest_camera_name: str
    latest_location: str
    latest_people_count: u256
    latest_threshold: u256
    latest_avg_score: str
    latest_alert_level: str
    latest_timestamp: str
    latest_labels: str
    analysis_count: u256

    def __init__(self):
        self.project_name = 'GenLayer Occupancy Desk'
        self.latest_title = ''
        self.latest_camera_name = ''
        self.latest_location = ''
        self.latest_people_count = 0
        self.latest_threshold = 0
        self.latest_avg_score = ''
        self.latest_alert_level = ''
        self.latest_timestamp = ''
        self.latest_labels = ''
        self.analysis_count = 0

    @gl.public.write
    def register_snapshot(
        self,
        title: str,
        camera_name: str,
        location: str,
        people_count: int,
        threshold: int,
        avg_score: str,
        alert_level: str,
        timestamp: str,
        labels: str,
    ) -> str:
        self.latest_title = title
        self.latest_camera_name = camera_name
        self.latest_location = location
        self.latest_people_count = people_count
        self.latest_threshold = threshold
        self.latest_avg_score = str(avg_score)
        self.latest_alert_level = str(alert_level)
        self.latest_timestamp = str(timestamp)
        self.latest_labels = str(labels)
        self.analysis_count += 1

        return (
            'registered=' + title
            + ';camera=' + camera_name
            + ';people=' + str(people_count)
            + ';alert=' + alert_level
        )

    @gl.public.view
    def project(self) -> str:
        return self.project_name

    @gl.public.view
    def stats(self) -> str:
        return (
            'snapshots=' + str(self.analysis_count)
            + ';people=' + str(self.latest_people_count)
            + ';alert=' + self.latest_alert_level
        )

    @gl.public.view
    def latest_record(self) -> str:
        return (
            'title=' + self.latest_title
            + ';camera=' + self.latest_camera_name
            + ';location=' + self.latest_location
            + ';count=' + str(self.latest_people_count)
            + ';threshold=' + str(self.latest_threshold)
            + ';avg_score=' + self.latest_avg_score
            + ';alert=' + self.latest_alert_level
            + ';timestamp=' + self.latest_timestamp
            + ';labels=' + self.latest_labels
        )
