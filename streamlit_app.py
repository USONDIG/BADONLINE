"""Streamlit Community Cloud entrypoint; reuses the original website assets."""
from pathlib import Path
import base64
import re

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"


def website_html():
    """Bundle trusted repository assets; never interpolate visitor input."""
    source = (PUBLIC / "index.html").read_text(encoding="utf-8")
    body = re.search(r"<body>(.*)</body>", source, re.S).group(1)
    css = (PUBLIC / "style.css").read_text(encoding="utf-8")
    script = (PUBLIC / "app.js").read_text(encoding="utf-8")
    image = base64.b64encode((PUBLIC / "assets/collection.svg").read_bytes()).decode("ascii")
    body = body.replace('/assets/collection.svg', f'data:image/svg+xml;base64,{image}')
    body = body.replace('id="quote-form"', 'id="quote-form" data-static="true"')
    # Streamlit does not run server.mjs: keep the transparent mailto flow.
    script = script.replace("fetch('/api/config')", "Promise.resolve({ok: false})")
    shell = """
    [data-testid="stHeader"] {display:none;}
    [data-testid="stMainBlockContainer"] {padding:0;max-width:none;}
    [data-testid="stMain"] {background:#e8ece9;}
    [data-testid="stVerticalBlock"] {gap:0;}
    """
    return f"<style>{css}\n{shell}</style>{body}<script>(() => {{\n{script}\n}})();</script>"


def main():
    import streamlit as st
    st.set_page_config(
        page_title="BADONLINE — Votre club. Vos couleurs. Votre jeu.",
        page_icon="🏸",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    # Only the HTML/CSS/JS tracked in this repository is executed.
    st.html(website_html(), unsafe_allow_javascript=True)


if __name__ == "__main__":
    main()
