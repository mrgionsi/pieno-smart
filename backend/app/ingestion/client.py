from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser
import time
from urllib.parse import urljoin

import httpx

from app.core.config import Settings, get_settings

PRICE_LINK_TEXT = "Prezzo alle 8 di mattina"
STATION_LINK_TEXT = "Anagrafica degli impianti attivi"


@dataclass(slots=True)
class MimitDownloadPayload:
    dataset_page_url: str
    stations_url: str
    prices_url: str
    stations_content: str
    prices_content: str


class MimitDatasetClient:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._own_client = http_client is None
        self.http_client = http_client or httpx.Client(
            timeout=self.settings.mimit_http_timeout_seconds,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; PienoSmartBot/0.1; "
                    "+https://github.com/mrgionsi/pieno-smart)"
                ),
                "Accept": "text/csv,text/plain,text/html,application/xhtml+xml,*/*",
                "Connection": "close",
            },
        )

    def close(self) -> None:
        if self._own_client:
            self.http_client.close()

    def download_current_snapshot(self) -> MimitDownloadPayload:
        dataset_page_url = self.settings.mimit_dataset_page_url
        dataset_page_response = self._get_with_retry(dataset_page_url)
        dataset_page_response.raise_for_status()

        parser = DatasetPageLinkParser()
        parser.feed(dataset_page_response.text)

        prices_url = parser.require_url(PRICE_LINK_TEXT, dataset_page_url)
        stations_url = parser.require_url(STATION_LINK_TEXT, dataset_page_url)

        stations_response = self._get_with_retry(stations_url)
        stations_response.raise_for_status()

        prices_response = self._get_with_retry(prices_url)
        prices_response.raise_for_status()

        return MimitDownloadPayload(
            dataset_page_url=dataset_page_url,
            stations_url=stations_url,
            prices_url=prices_url,
            stations_content=stations_response.text,
            prices_content=prices_response.text,
        )

    def _get_with_retry(self, url: str) -> httpx.Response:
        last_error: Exception | None = None

        for attempt in range(1, self.settings.mimit_http_max_retries + 1):
            try:
                return self.http_client.get(url)
            except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as exc:
                last_error = exc
                if attempt == self.settings.mimit_http_max_retries:
                    break
                time.sleep(0.5 * attempt)

        raise RuntimeError(f"Failed to fetch MIMIT resource after retries: {url}") from last_error


class DatasetPageLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._current_href: str | None = None
        self._links: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        attr_map = dict(attrs)
        self._current_href = attr_map.get("href")

    def handle_data(self, data: str) -> None:
        if self._current_href is None:
            return
        text = data.strip()
        if text:
            self._links.append((text, self._current_href))

    def handle_endtag(self, tag: str) -> None:
        if tag == "a":
            self._current_href = None

    def require_url(self, link_text: str, base_url: str) -> str:
        for text, href in self._links:
            if text == link_text:
                return urljoin(base_url, href)
        raise ValueError(f"Could not find link with text: {link_text}")
