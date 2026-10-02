#!/usr/bin/env python3
"""Snapshot a public REDCap dashboard into a self-contained static folder.

Usage: snapshot_redcap_dashboard.py URL OUTPUT_DIR

Downloads the dashboard page and its requisites with wget, rewrites every
reference to local relative paths, adds noindex and a capture banner, and
replaces OUTPUT_DIR only when the page content (ignoring the banner) changed.
Exit status: 0 = updated, 3 = no change, other = error.
"""
import datetime
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

BANNER_START = "<!-- archive-banner -->"
BANNER_END = "<!-- /archive-banner -->"
TEXT_EXT = (".html", ".css", ".js")


def run_wget(url, dest):
    host = urllib.parse.urlparse(url).hostname
    cmd = ["wget", "-nv", "--page-requisites", "--convert-links", "--adjust-extension",
           "--span-hosts", f"--domains={host}", "-nH", "-e", "robots=off",
           "--wait=1", "--random-wait", "--tries=3", "--timeout=30",
           "-o", os.path.join(dest, "wget.log"), url]
    # wget exits 8 when any requisite 404s; that is expected for REDCap's CSS.
    rc = subprocess.call(cmd, cwd=dest)
    if rc not in (0, 8):
        sys.exit(f"wget failed with exit {rc}; see {dest}/wget.log")


def find_page(root):
    for dirpath, _, files in os.walk(root):
        for f in files:
            if f.endswith(".html") and "__dashboard=" in f:
                return os.path.join(dirpath, f)
    sys.exit("dashboard HTML not found in wget output")


def strip_query_filenames(root):
    """Rename 'style.css?123.css' -> 'style.css'; return {old_basename: new_basename}."""
    renames = {}
    for dirpath, _, files in os.walk(root):
        for f in files:
            if "?" in f:
                new = f.split("?", 1)[0]
                os.replace(os.path.join(dirpath, f), os.path.join(dirpath, new))
                renames[f] = new
    return renames


def rewrite_text(text, renames, host, prefix):
    for old in sorted(renames, key=len, reverse=True):
        new = renames[old]
        text = text.replace(old.replace("?", "%3F"), new).replace(old, new)
    # Absolute same-host asset URLs -> relative to the page/stylesheet.
    text = re.sub(r"https?://" + re.escape(host) + r"/(redcap_v[^\"')\s]+)",
                  lambda m: prefix + m.group(1), text)
    return text


def signature(html):
    """Content fingerprint of a dashboard: chart data plus visible text.

    REDCap varies markup between requests (chart ids, cached vs. freshly built
    layout, timestamps, random jitter on dot plots), so compare only what the
    dashboard actually shows.
    """
    charts = set()
    for args in re.findall(r'renderSmartChart\("[^"]+",(.*?)\);</script>', html, flags=re.S):
        charts.add(re.sub(r'"y":-?[0-9.]+', '"y":0', args))
    body = re.sub(re.escape(BANNER_START) + ".*?" + re.escape(BANNER_END), "", html, flags=re.S)
    body = re.sub(r"<(script|style)\b.*?</\1>", " ", body, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", body)
    text = re.sub(r"Displaying [^.]*?information( generated [^<]*? ago)?", " ", text)
    text = " ".join(text.split())
    return sorted(charts), text


def fetch_missing_page_refs(html, stage, host):
    """Fetch same-host files the page links to that wget skips (e.g. apple-touch-icon)."""
    for ref in sorted(set(re.findall(r'(?:src|href)="(redcap_v[^"?#]+)', html))):
        path = os.path.join(stage, urllib.parse.unquote(ref))
        if os.path.exists(path):
            continue
        try:
            with urllib.request.urlopen(f"https://{host}/{ref}", timeout=30) as resp:
                data = resp.read()
        except Exception as exc:  # missing upstream too; leave it
            print(f"skip {ref}: {exc}")
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    url, out_dir = sys.argv[1], os.path.abspath(sys.argv[2])
    host = urllib.parse.urlparse(url).hostname

    work = tempfile.mkdtemp(prefix="rc-snap-")
    try:
        run_wget(url, work)
        page = find_page(work)
        stage = os.path.join(work, "stage")
        os.makedirs(stage)
        for entry in os.listdir(work):
            if entry.startswith("redcap_v"):
                shutil.move(os.path.join(work, entry), os.path.join(stage, entry))
        shutil.move(page, os.path.join(stage, "index.html"))

        renames = strip_query_filenames(stage)
        for dirpath, _, files in os.walk(stage):
            for f in files:
                if not f.endswith(TEXT_EXT):
                    continue
                path = os.path.join(dirpath, f)
                depth = os.path.relpath(dirpath, stage).count(os.sep) + (0 if dirpath == stage else 1)
                with open(path, encoding="utf-8", errors="surrogateescape") as fh:
                    text = fh.read()
                text = rewrite_text(text, renames, host, "../" * depth)
                if path.endswith("index.html") and dirpath == stage:
                    # Page moved up from surveys/ to the snapshot root.
                    text = re.sub(r'((?:src|href)=")\.\./(redcap_v)', r"\1\2", text)
                with open(path, "w", encoding="utf-8", errors="surrogateescape") as fh:
                    fh.write(text)

        index = os.path.join(stage, "index.html")
        with open(index, encoding="utf-8") as fh:
            html = fh.read()
        fetch_missing_page_refs(html, stage, host)
        if 'name="robots"' not in html:
            html = re.sub(r"(<head[^>]*>)", r'\1\n<meta name="robots" content="noindex, nofollow">', html, count=1)
        # Akamai mPulse real-user-monitoring beacon injected by the host's CDN.
        html = re.sub(r"<script>(?:(?!</script>).)*go-mpulse\.net(?:(?!</script>).)*</script>", "", html, flags=re.S)

        old_index = os.path.join(out_dir, "index.html")
        if os.path.exists(old_index):
            with open(old_index, encoding="utf-8") as fh:
                previous = fh.read()
            if signature(previous) == signature(html):
                print("No change in dashboard content.")
                return 3

        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        banner = (f'{BANNER_START}<div style="background:#fff8d6;border-bottom:1px solid #e0d38a;'
                  f'padding:6px 12px;font:13px/1.4 sans-serif;color:#333">Archived snapshot of '
                  f'<a href="{url}">{url}</a>, captured {stamp}.</div>{BANNER_END}\n')
        html = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + "\n" + banner, html, count=1)
        with open(index, "w", encoding="utf-8") as fh:
            fh.write(html)

        if os.path.exists(out_dir):
            shutil.rmtree(out_dir)
        shutil.copytree(stage, out_dir)
        print(f"Updated {out_dir} ({stamp}).")
        return 0
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
