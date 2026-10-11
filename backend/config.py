import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    BASE_DIR: Path = BASE_DIR
    PROJECT_NAME: str = "ShopScape AI"

    PROJECT_DESCRIPTION: str = "Professional AI-Powered E-Commerce Business Platform"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/store.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-ecommerce-jwt-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Store & Currency Settings
    STORE_NAME: str = os.getenv("STORE_NAME", "ShopScape AI")
    STORE_CURRENCY: str = os.getenv("STORE_CURRENCY", "INR")  # INR or USD
    STORE_CURRENCY_SYMBOL: str = os.getenv("STORE_CURRENCY_SYMBOL", "₹")  # ₹ or $
    SHIPPING_FLAT_RATE: float = float(os.getenv("SHIPPING_FLAT_RATE", "50.0"))
    FREE_SHIPPING_THRESHOLD: float = float(os.getenv("FREE_SHIPPING_THRESHOLD", "499.0"))
    TAX_RATE: float = float(os.getenv("TAX_RATE", "0.05"))  # 5% GST/Tax
    
    # AI Model Providers
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    DEFAULT_AI_PROVIDER: str = os.getenv("DEFAULT_AI_PROVIDER", "google" if (os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")) else "groq")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # Admin Credentials for Seeding
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@shopscape.ai")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "AdminPass123!")
    
    # Payment Gateway
    PAYMENT_PROVIDER: str = os.getenv("PAYMENT_PROVIDER", "sandbox")  # sandbox, razorpay, stripe
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    STRIPE_PUBLIC_KEY: str = os.getenv("STRIPE_PUBLIC_KEY", "")
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")

settings = Settings()

