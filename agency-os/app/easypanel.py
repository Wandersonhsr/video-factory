import os
from typing import Any

import httpx


class EasypanelClient:
    def __init__(self, base_url: str | None = None, token: str | None = None):
        self.base_url = (base_url or os.getenv("EASYPANEL_URL", "")).rstrip("/")
        self.token = token or os.getenv("EASYPANEL_TOKEN", "")
        if not self.base_url:
            raise ValueError("EASYPANEL_URL is required")
        if not self.token:
            raise ValueError("EASYPANEL_TOKEN is required")

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    async def _post(self, endpoint: str, payload: dict[str, Any]) -> Any:
        async with httpx.AsyncClient(timeout=90.0) as client:
            r = await client.post(f"{self.base_url}/api/{endpoint}", headers=self._headers(), json=payload)
            r.raise_for_status()
            if not r.content:
                return None
            return r.json()

    async def _get(self, endpoint: str, params: dict[str, Any]) -> Any:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(f"{self.base_url}/api/{endpoint}", headers=self._headers(), params=params)
            r.raise_for_status()
            if not r.content:
                return None
            return r.json()

    async def inspect_app(self, project: str, service: str) -> Any:
        return await self._get("inspectAppService", {"projectName": project, "serviceName": service})

    async def use_github_source(self, project: str, service: str, owner: str, repo: str, ref: str, path: str = "/") -> Any:
        return await self._post("updateAppSourceGithub", {
            "projectName": project,
            "serviceName": service,
            "owner": owner,
            "repo": repo,
            "ref": ref,
            "path": path,
        })

    async def set_env(self, project: str, service: str, env: str) -> Any:
        return await self._post("updateAppEnv", {
            "projectName": project,
            "serviceName": service,
            "env": env,
        })

    async def deploy(self, project: str, service: str, force_rebuild: bool = True) -> Any:
        return await self._post("deployAppService", {
            "projectName": project,
            "serviceName": service,
            "forceRebuild": force_rebuild,
        })

    async def restart(self, project: str, service: str) -> Any:
        return await self._post("restartAppService", {
            "projectName": project,
            "serviceName": service,
        })
