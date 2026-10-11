import os
import sqlite3
import tempfile

import streamlit as st

from shopping_agent import (
    agent,
    build_agent,
    extract_text_content,
    DB_PATH,
)

# ---------------------------------------------------------------------------
# Page Configuration & Styling
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="AI Shopping Assistant",
    page_icon="🛒",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        margin-bottom: 0.2rem;
        background: linear-gradient(90deg, #10b981, #06b6d4, #3b82f6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .sub-caption {
        color: #94a3b8;
        font-size: 1rem;
        margin-bottom: 1.5rem;
    }
    .sample-chip {
        display: inline-block;
        padding: 4px 10px;
        margin: 4px;
        background-color: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        font-size: 0.85rem;
        cursor: pointer;
    }
    .order-card {
        padding: 10px;
        margin-bottom: 8px;
        background-color: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        border-left: 3px solid #10b981;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="main-header">🛒 AI Shopping Assistant</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-caption">Your intelligent shopping companion — search inventory, compare verified reviews, and place orders directly.</div>',
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Session State Initialization
# ---------------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "custom_agent" not in st.session_state:
    st.session_state.custom_agent = None

current_agent = st.session_state.custom_agent or agent

# ---------------------------------------------------------------------------
# Sidebar: Controls, Images, and Orders
# ---------------------------------------------------------------------------
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # Provider detection
    has_google = bool(os.getenv("GOOGLE_API_KEY"))
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    
    provider_options = []
    if has_google or not has_groq:
        provider_options.append("Google Gemini (Default)")
    if has_groq or not has_google:
        provider_options.append("Groq")
        
    selected_provider_label = st.selectbox(
        "AI Provider",
        provider_options,
        index=0,
        help="Select which LLM provider powers the shopping agent."
    )
    provider_key = "google" if "Gemini" in selected_provider_label else "groq"

    if provider_key == "google":
        model_options = [
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
        ]
    else:
        model_options = [
            "llama-3.3-70b-versatile",
            "qwen/qwen3.8-27b",
        ]

    selected_model = st.selectbox(
        "Model",
        model_options,
        index=0,
        help="Select model to use."
    )
    
    key_env_var = "GOOGLE_API_KEY" if provider_key == "google" else "GROQ_API_KEY"
    default_key = os.getenv(key_env_var, "")
    
    api_key_input = st.text_input(
        f"{key_env_var} (optional override)",
        value=default_key,
        type="password",
        placeholder="Enter API key...",
        help="Will use the key from your environment/.env if left as-is."
    )

    if st.button("Apply Settings / Rebuild Agent", use_container_width=True):
        try:
            st.session_state.custom_agent = build_agent(
                provider=provider_key,
                api_key=api_key_input if api_key_input else None,
                model=selected_model
            )
            st.success(f"Agent reconfigured with {selected_model}!")
            current_agent = st.session_state.custom_agent
        except Exception as e:
            st.error(f"Failed to build agent: {e}")

    st.divider()


    # Shop by Image
    st.header("📷 Shop by Image")
    st.caption("Upload a product photo or pick a sample to discover matching store items.")

    uploaded_file = st.file_uploader(
        "Upload product image",
        type=["jpg", "jpeg", "png", "webp"],
        key="image_uploader"
    )

    if uploaded_file:
        st.image(uploaded_file, caption=f"Uploaded: {uploaded_file.name}", use_container_width=True)
        if st.button("🔍 Find Similar Products", use_container_width=True, type="primary"):
            suffix = os.path.splitext(uploaded_file.name)[1] or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(uploaded_file.getvalue())
                image_path = tmp.name

            prompt = f"I uploaded a product image. Please analyze it and find similar products in the store. Image path: {image_path}"
            st.session_state.messages.append({
                "role": "user",
                "content": prompt,
                "display_name": uploaded_file.name,
                "image_data": uploaded_file.getvalue(),
            })
            st.session_state.pending_image = uploaded_file.name
            st.rerun()

    # Pre-loaded sample images from resources/
    sample_dir = os.path.join(os.path.dirname(__file__), "resources")
    sample_images = {
        "🍯 Honey Jar": os.path.join(sample_dir, "honey.png"),
        "🌾 Rolled Oats": os.path.join(sample_dir, "oats.png"),
        "🐘 Elephant (Non-product test)": os.path.join(sample_dir, "elephant.png"),
    }
    
    existing_samples = {k: v for k, v in sample_images.items() if os.path.exists(v)}
    if existing_samples:
        st.caption("Or test with preloaded samples:")
        sample_cols = st.columns(len(existing_samples))
        for col, (label, sample_path) in zip(sample_cols, existing_samples.items()):
            if col.button(label, use_container_width=True):
                with open(sample_path, "rb") as f:
                    img_bytes = f.read()
                filename = os.path.basename(sample_path)
                prompt = f"I uploaded a product image. Please analyze it and find similar products in the store. Image path: {sample_path}"
                st.session_state.messages.append({
                    "role": "user",
                    "content": prompt,
                    "display_name": filename,
                    "image_data": img_bytes,
                })
                st.session_state.pending_image = filename
                st.rerun()

    st.divider()

    # Recent Orders View
    st.header("📦 Recent Orders")
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, product_name, price, ordered_at FROM orders ORDER BY id DESC LIMIT 5")
        orders = c.fetchall()
        conn.close()

        if orders:
            for o in orders:
                st.markdown(
                    f"""
                    <div class="order-card">
                        <strong>Order #{o[0]}</strong>: {o[1]}<br/>
                        <small style="color:#10b981;">${o[2]:.2f}</small> • <small style="color:#94a3b8;">{o[3]}</small>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            st.caption("No orders placed yet.")
    except Exception as e:
        st.caption(f"Could not load orders: {e}")

    st.divider()
    if st.button("🗑️ Clear Chat History", use_container_width=True):
        st.session_state.messages = []
        if "pending_image" in st.session_state:
            del st.session_state.pending_image
        st.rerun()


# ---------------------------------------------------------------------------
# Chat History Rendering
# ---------------------------------------------------------------------------
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        if msg["role"] == "user" and msg["content"].startswith("I uploaded a product image"):
            disp_name = msg.get("display_name")
            if not disp_name:
                filename = msg["content"].split("Image path:")[-1].strip()
                disp_name = os.path.basename(filename)
            st.markdown(f"🖼️ Searching by image: **{disp_name}**")
            if "image_data" in msg and msg["image_data"]:
                st.image(msg["image_data"], width=200)
        else:
            cleaned_text = extract_text_content(msg["content"]).replace("$", r"\$")
            st.markdown(cleaned_text)


# ---------------------------------------------------------------------------
# Helper: Invoke Agent and Extract Safe Response
# ---------------------------------------------------------------------------
def run_agent_and_respond(prompt_messages):
    try:
        # Convert session messages to pure role/content dicts for LangChain
        clean_history = [
            {"role": m["role"], "content": m["content"]}
            for m in prompt_messages
        ]
        result = current_agent.invoke({"messages": clean_history})
        last_msg = result["messages"][-1]
        response_text = extract_text_content(last_msg.content).replace("`", "")
        return response_text
    except Exception as exc:
        err_msg = str(exc)
        if "API_KEY" in err_msg.upper() or "AUTHENTICATION" in err_msg.upper():
            return f"⚠️ **Authentication Error**: Missing or invalid API key. Please configure your API key in `.env` or in the sidebar.\n\nDetails: `{err_msg}`"
        return f"⚠️ **Error executing request**: {err_msg}"


# ---------------------------------------------------------------------------
# Process Pending Image Searches
# ---------------------------------------------------------------------------
if (
    st.session_state.messages
    and st.session_state.messages[-1]["role"] == "user"
    and "pending_image" in st.session_state
):
    with st.chat_message("assistant"):
        with st.spinner("Analyzing image with vision model and querying store database…"):
            response = run_agent_and_respond(st.session_state.messages)
        st.markdown(response.replace("$", r"\$"))

    st.session_state.messages.append({"role": "assistant", "content": response})
    del st.session_state.pending_image
    st.rerun()


# ---------------------------------------------------------------------------
# Quick Suggestion Chips
# ---------------------------------------------------------------------------
if not st.session_state.messages:
    st.markdown("##### 💡 Try asking:")
    sug_cols = st.columns(3)
    sug1 = "I want organic honey with 4.5+ rating and less than $20 price."
    sug2 = "Recommend the best organic olive oil or cooking oil."
    sug3 = "Show me healthy whole-grain breakfast oats."
    
    if sug_cols[0].button("🍯 Organic Honey under $20", use_container_width=True):
        st.session_state.messages.append({"role": "user", "content": sug1})
        st.rerun()
    if sug_cols[1].button("🫒 Best Organic Olive Oil", use_container_width=True):
        st.session_state.messages.append({"role": "user", "content": sug2})
        st.rerun()
    if sug_cols[2].button("🥣 Whole Grain Breakfast Oats", use_container_width=True):
        st.session_state.messages.append({"role": "user", "content": sug3})
        st.rerun()


# ---------------------------------------------------------------------------
# Text Input
# ---------------------------------------------------------------------------
if prompt := st.chat_input("e.g. I want organic honey under $20 with 4+ rating, or say 'Order #1'"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Thinking…"):
            response = run_agent_and_respond(st.session_state.messages)
        st.markdown(response.replace("$", r"\$"))

    st.session_state.messages.append({"role": "assistant", "content": response})
    st.rerun()
