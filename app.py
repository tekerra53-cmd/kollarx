from __future__ import annotations

import json
import os
from copy import deepcopy
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote

from flask import Flask, flash, redirect, render_template, request, session, url_for
from flask_cors import CORS
from markupsafe import Markup
from werkzeug.utils import secure_filename


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ICON_MAP_PATH = DATA_DIR / "icons.json"
STATE_FILE = DATA_DIR / "state.json"
AVATAR_DIR = BASE_DIR / "static" / "images" / "avatars"


def load_icon_map() -> dict[str, str]:
    if not ICON_MAP_PATH.exists():
        return {}
    return json.loads(ICON_MAP_PATH.read_text(encoding="utf-8"))


ICON_MAP = load_icon_map()


def icon(name: str) -> Markup:
    svg = ICON_MAP.get(name)
    if not svg:
        return Markup('<span class="inline-flex h-4 w-4 items-center justify-center">•</span>')
    return Markup(svg)


def iso_now() -> str:
    return datetime.utcnow().isoformat()


def format_date(value: str) -> str:
    dt = datetime.fromisoformat(value)
    return dt.strftime("%b") + f" {dt.day}, {dt.year}"


def format_currency(value: int | float) -> str:
    return f"₦{value:,.0f}"


def create_id(prefix: str) -> str:
    return f"{prefix}-{os.urandom(3).hex().upper()}"


def create_member_code() -> str:
    return f"K-{int.from_bytes(os.urandom(2), 'big') % 90000 + 10000}"


def seed_state() -> dict[str, Any]:
    now = datetime.utcnow()
    return {
        "users": [
            {
                "id": "admin-1",
                "memberCode": "K-53522",
                "fullName": "KollraX Admin",
                "email": "admin@kollrax.com",
                "phone": "",
                "password": "Admin@123",
                "company": "KollraX",
                "role": "admin",
                "avatar": None,
                "createdAt": now.isoformat(),
            },
            {
                "id": "client-1",
                "memberCode": "K-78215",
                "fullName": "Elena Watson",
                "email": "elena@northbridge.co",
                "phone": "",
                "password": "Client@123",
                "company": "Northbridge Partners",
                "role": "client",
                "avatar": None,
                "createdAt": now.isoformat(),
            },
        ],
        "tickets": [
            {
                "id": "TK-1001",
                "userId": "client-1",
                "subject": "Microsoft 365 migration planning",
                "category": "Service Request",
                "priority": "High",
                "message": "Need a staged migration approach for 140 users across three regions.",
                "status": "In Progress",
                "createdAt": (now - timedelta(days=2)).isoformat(),
                "updates": [
                    {
                        "by": "KollraX Admin",
                        "role": "admin",
                        "message": "Discovery workshop has been scheduled for Thursday 10:00 AM.",
                        "createdAt": (now - timedelta(days=1)).isoformat(),
                    }
                ],
            }
        ],
        "leads": [
            {
                "id": "LD-3001",
                "name": "Riley Henderson",
                "email": "riley@altitudebio.io",
                "phone": "+234 801 234 5678",
                "company": "Altitude Bio",
                "staffSize": "51-200",
                "usesMicrosoft365": "Yes",
                "needs": ["Security", "Ongoing support"],
                "budgetRange": "₦2m - ₦5m",
                "urgency": "This week",
                "focus": "Security and compliance",
                "message": "We need compliance hardening and managed support for a regulated team.",
                "stage": "Contacted",
                "owner": "Collins",
                "createdAt": (now - timedelta(days=3)).isoformat(),
            }
        ],
        "services": [
            {
                "id": "starter-plan",
                "title": "Starter Plan",
                "description": "₦50,000/month for small businesses with basic Microsoft 365 admin and email support.",
                "enabled": True,
            },
            {
                "id": "business-plan",
                "title": "Business Plan",
                "description": "₦100,000/month for growing teams that need tenant management, baseline security, and faster support.",
                "enabled": True,
            },
            {
                "id": "enterprise-plan",
                "title": "Enterprise Plan",
                "description": "₦250,000/month+ for larger organizations that need compliance, migration support, and priority SLA coverage.",
                "enabled": True,
            },
        ],
        "notifications": [
            {
                "id": "notice-0",
                "title": "Platform Notice 1",
                "message": "2 high-priority support tickets require admin review.",
                "audience": "Admin feed",
            },
            {
                "id": "notice-1",
                "title": "Platform Notice 2",
                "message": "One consultation lead needs follow-up assignment today.",
                "audience": "Admin feed",
            },
            {
                "id": "notice-2",
                "title": "Platform Notice 3",
                "message": "Subscription renewal batch scheduled for tonight at 21:00.",
                "audience": "Admin feed",
            },
        ],
        "content_entries": {
            "Website content": "Refresh homepage positioning for Microsoft 365 managed operations and enterprise support.",
            "Testimonials": "Highlight recent migration delivery wins and managed support satisfaction notes.",
            "FAQs": "Add billing, onboarding, and compliance workflow questions for enterprise buyers.",
            "Service information": "Clarify migration, deployment, compliance, and consultation engagement stages.",
            "Announcements": "Prepare admin-controlled platform notices for maintenance windows and release changes.",
            "Blog/news architecture": "Outline publishing workflow for insights, updates, and thought leadership content.",
        },
    }


def save_state(state: dict[str, Any] | None = None) -> None:
    state = state or STATE
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        # best-effort persistence; ignore errors in dev mode
        pass


def load_state() -> dict[str, Any]:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    state = seed_state()
    try:
        save_state(state)
    except Exception:
        pass
    return state


STATE = load_state()

BILLING_PLANS: dict[str, dict[str, Any]] = {
    "starter": {
        "id": "starter",
        "name": "Starter Plan",
        "badge": "Best for small teams",
        "price_per_user": 5000,
        "minimum_users": 3,
        "minimum_monthly": 15000,
        "response": "24-48 hrs",
        "summary": "Core Microsoft 365 admin support for lean teams.",
        "features": [
            "Microsoft 365 admin support",
            "Email and login issue resolution",
            "User account setup and management",
            "Password reset and recovery",
            "Basic Teams support",
            "MFA setup and basic security policies",
            "Email + WhatsApp support",
        ],
        "note": "Minimum 3 active users and a minimum monthly charge of ₦15,000.",
        "cta_label": "Continue to payment",
    },
    "business": {
        "id": "business",
        "name": "Business Plan",
        "badge": "Most popular",
        "price_per_user": 6500,
        "recommended_users": "10-50",
        "response": "4-12 hrs",
        "summary": "Full tenant management with priority support and monthly optimization.",
        "features": [
            "Full Microsoft 365 tenant management",
            "Teams, SharePoint, and OneDrive configuration",
            "User onboarding and offboarding",
            "MFA enforcement and conditional access policies",
            "Secure Score optimization and admin hardening",
            "Monthly performance reports",
            "Priority support",
        ],
        "note": "Recommended for 10-50 users.",
        "cta_label": "Continue to payment",
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise Plan",
        "badge": "Custom quote",
        "price_per_user_min": 8000,
        "price_per_user_max": 12000,
        "response": "1-2 hrs",
        "summary": "Custom-managed Microsoft 365 program with manual admin pricing.",
        "features": [
            "Dedicated account manager",
            "IT strategy sessions",
            "Compliance configuration",
            "DLP and threat protection monitoring",
            "24/7 escalation path",
            "Custom SLA and implementation plan",
        ],
        "note": "Final price is set manually by admin after review.",
        "cta_label": "Request enterprise quote",
    },
}

BILLING_ADDONS: dict[str, dict[str, Any]] = {
    "migration": {
        "id": "migration",
        "name": "Microsoft 365 Migration",
        "price_min": 150000,
        "price_max": 500000,
        "type": "one-time",
        "note": "Paid upfront and not part of subscription.",
    },
    "hardening": {
        "id": "hardening",
        "name": "Security Hardening",
        "price_min": 100000,
        "type": "one-time",
        "note": "From ₦100,000, billed upfront.",
    },
    "cleanup": {
        "id": "cleanup",
        "name": "Tenant Cleanup",
        "price_min": 80000,
        "type": "one-time",
        "note": "From ₦80,000, billed upfront.",
    },
}

DEFAULT_ONBOARDING_FEE = 0


def format_naira(value: int | float) -> Markup:
    return Markup(f"&#8358;{value:,.0f}")


def normalize_plan_key(plan_key: str | None) -> str:
    if plan_key in BILLING_PLANS:
        return plan_key
    return "starter"


def calculate_billing(plan_key: str, user_count: int, addon_ids: list[str] | None = None) -> dict[str, Any]:
    plan = BILLING_PLANS[normalize_plan_key(plan_key)]
    addon_ids = addon_ids or []
    addons = [BILLING_ADDONS[addon_id] for addon_id in addon_ids if addon_id in BILLING_ADDONS]
    safe_user_count = max(1, user_count)

    onboarding_fee = DEFAULT_ONBOARDING_FEE
    addon_total = sum(addon.get("price_min", 0) for addon in addons)

    summary: dict[str, Any] = {
        "plan": plan,
        "user_count": safe_user_count,
        "addons": addons,
        "onboarding_fee": onboarding_fee,
        "addon_total": addon_total,
        "first_payment_total": 0,
        "monthly_total": 0,
        "enterprise_range": None,
    }

    if plan["id"] == "enterprise":
        monthly_min = plan["price_per_user_min"] * safe_user_count
        monthly_max = plan["price_per_user_max"] * safe_user_count
        summary["enterprise_range"] = (monthly_min, monthly_max)
        summary["first_payment_total"] = monthly_min + onboarding_fee + addon_total
        summary["monthly_total"] = monthly_min
        return summary

    monthly_total = plan["price_per_user"] * safe_user_count
    minimum_monthly = plan.get("minimum_monthly", 0)
    if minimum_monthly:
        monthly_total = max(monthly_total, minimum_monthly)

    summary["monthly_total"] = monthly_total
    summary["first_payment_total"] = monthly_total + onboarding_fee + addon_total
    return summary


def get_current_user() -> dict[str, Any] | None:
    user_id = session.get("user_id")
    if not user_id:
        return None
    return next((user for user in STATE["users"] if user["id"] == user_id), None)


def find_user_by_email(email: str) -> dict[str, Any] | None:
    email = email.lower().strip()
    return next((user for user in STATE["users"] if user["email"].lower() == email), None)


def find_ticket(ticket_id: str) -> dict[str, Any] | None:
    return next((ticket for ticket in STATE["tickets"] if ticket["id"] == ticket_id), None)


def find_lead(lead_id: str) -> dict[str, Any] | None:
    return next((lead for lead in STATE["leads"] if lead["id"] == lead_id), None)


def find_service(service_id: str) -> dict[str, Any] | None:
    return next((service for service in STATE["services"] if service["id"] == service_id), None)


def get_user_tickets(user_id: str) -> list[dict[str, Any]]:
    return [ticket for ticket in STATE["tickets"] if ticket["userId"] == user_id]


def save_avatar_file(user: dict[str, Any], avatar_file: Any) -> None:
    if not avatar_file or avatar_file.filename == "":
        return
    filename = secure_filename(avatar_file.filename)
    suffix = Path(filename).suffix or ".png"
    avatar_filename = f"{user['id']}{suffix}"
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    target_path = AVATAR_DIR / avatar_filename
    avatar_file.save(target_path)
    user["avatar"] = f"images/avatars/{avatar_filename}"


def build_marketing_context() -> dict[str, Any]:
    return {
        "title": "KollraX | Microsoft 365 Business Platform",
        "service_plans": [
            {
                "id": "starter",
                "name": "Starter Plan",
                "price": Markup("&#8358;5,000 / user / month"),
                "best_for": "Minimum 3 users",
                "response": "24-48 hrs",
                "includes": [
                    "Microsoft 365 admin support",
                    "Email and login issue resolution",
                    "User account setup and management",
                    "Password reset support",
                    "Basic Teams support",
                    "MFA setup and basic security policies",
                    "Email + WhatsApp support",
                ],
                "excludes": ["Migration projects", "Dedicated account manager", "Advanced compliance configuration"],
            },
            {
                "id": "business",
                "name": "Business Plan",
                "price": Markup("&#8358;6,500 / user / month"),
                "best_for": "Most popular",
                "response": "4-12 hrs",
                "includes": [
                    "Full Microsoft 365 tenant management",
                    "Teams, SharePoint, and OneDrive configuration",
                    "User onboarding and offboarding",
                    "MFA enforcement and conditional access policies",
                    "Secure Score optimization and admin hardening",
                    "Priority support",
                    "Monthly optimization report",
                ],
                "excludes": [],
            },
            {
                "id": "enterprise",
                "name": "Enterprise Plan",
                "price": Markup("&#8358;8,000 - &#8358;12,000 / user / month"),
                "best_for": "Custom quote required",
                "response": "1-2 hrs",
                "includes": [
                    "Dedicated account manager",
                    "IT strategy sessions",
                    "Compliance configuration",
                    "DLP and threat protection monitoring",
                    "24/7 escalation path",
                    "Custom SLA and implementation plan",
                ],
                "excludes": [],
            },
        ],
        "add_on_services": [
            "Microsoft 365 migration -> From &#8358;150K",
            "Security hardening -> From &#8358;100K",
            "Tenant cleanup -> From &#8358;80K",
        ],
        "partners": [
            {"name": "Microsoft Solutions Partner", "logo": "logos/microsoft-solutions-partner.svg"},
            {"name": "Azure Integration Alliance", "logo": "logos/azure-integration-alliance.svg"},
            {"name": "SentinelOps Security", "logo": "logos/sentinelops-security.svg"},
            {"name": "Purview Governance Labs", "logo": "logos/purview-governance-labs.svg"},
            {"name": "CloudRoute Migration Group", "logo": "logos/cloudroute-migration-group.svg"},
            {"name": "Teams Collaboration Network", "logo": "logos/teams-collaboration-network.svg"},
            {
                "name": "TechEera",
                "logo": "logos/techeera-logo.png",
                "tileClassName": "min-w-[300px] px-5 py-4",
                "imageClassName": "h-16",
            },
        ],
        "hero_metrics": [
            {"label": "Secure Migrations", "value": "300+"},
            {"label": "Support SLA", "value": "< 2h"},
            {"label": "Governed Workspaces", "value": "24/7"},
        ],
        "solution_pillars": [
            {
                "icon": "ShieldCheck",
                "title": "Security-first governance",
                "body": "Identity-aware access policies, compliance layering, and operational guardrails from day one.",
            },
            {
                "icon": "Cloud",
                "title": "Cloud-native delivery",
                "body": "Structured migrations, change orchestration, and scalable Microsoft 365 foundations.",
            },
            {
                "icon": "LifeBuoy",
                "title": "Continuous service assurance",
                "body": "Managed support, operational visibility, and proactive improvement across the workspace lifecycle.",
            },
        ],
    }


def build_contact_context(form_data: Any | None = None, done: bool = False, submitted_lead: dict[str, Any] | None = None) -> dict[str, Any]:
    lead = submitted_lead or {}
    whatsapp_message = ""
    if submitted_lead:
        whatsapp_message = quote(
            f"Hi, I just submitted a request on KollraX. My name is {submitted_lead['name']} and I need help with {', '.join(submitted_lead['needs'])}."
        )

    return {
        "title": "KollraX | Smart Intake",
        "done": done,
        "submitted_lead": lead,
        "whatsapp_message": whatsapp_message,
        "form_data": form_data or {},
        "selected_needs": form_data.getlist("needs") if form_data else [],
    }


def build_plan_selection_context(selection: dict[str, Any] | None = None) -> dict[str, Any]:
    selection = selection or {}
    plan_key = normalize_plan_key(selection.get("plan"))
    user_count = int(selection.get("user_count", 3) or 3)
    addon_ids = selection.get("addons", [])
    summary = calculate_billing(plan_key, user_count, addon_ids)
    return {
        "title": "KollraX | Choose a Plan",
        "billing_plans": list(BILLING_PLANS.values()),
        "billing_addons": list(BILLING_ADDONS.values()),
        "selected_plan": plan_key,
        "selected_user_count": summary["user_count"],
        "selected_addons": addon_ids,
        "billing_summary": summary,
    }


def build_checkout_context(selection: dict[str, Any] | None = None, form_data: Any | None = None, completed: bool = False) -> dict[str, Any]:
    selection = selection or {}
    plan_key = normalize_plan_key(selection.get("plan"))
    user_count = int(selection.get("user_count", 3) or 3)
    addon_ids = selection.get("addons", [])
    summary = calculate_billing(plan_key, user_count, addon_ids)
    return {
        "title": "KollraX | Checkout",
        "billing_plans": list(BILLING_PLANS.values()),
        "billing_addons": list(BILLING_ADDONS.values()),
        "selected_plan": plan_key,
        "selected_user_count": summary["user_count"],
        "selected_addons": addon_ids,
        "billing_summary": summary,
        "completed": completed,
        "form_data": form_data or {},
    }


def build_admin_context() -> dict[str, Any]:
    active_clients = len({user["company"] for user in STATE["users"] if user["role"] == "client"})
    admin_users = len([user for user in STATE["users"] if user["role"] == "admin"])
    users_with_avatars = len([user for user in STATE["users"] if user.get("avatar")])
    consultations = STATE["leads"][:4]
    open_tickets_count = len([ticket for ticket in STATE["tickets"] if ticket["status"] == "Open"])
    in_progress_tickets_count = len([ticket for ticket in STATE["tickets"] if ticket["status"] == "In Progress"])
    enabled_services = len([service for service in STATE["services"] if service["enabled"]])
    monthly_recurring_revenue = active_clients * 4200 + enabled_services * 850

    chart_values = [0.18, 0.42, 0.34, 0.47, 0.62, 0.41, 0.73, 0.68, 0.79, 0.98]
    chart_labels = ["Jan", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]
    chart_points = []
    for index, value in enumerate(chart_values):
        x = index * 52 + 24
        y = 148 - value * 112
        chart_points.append(f"{x},{y}")
    chart_path = " ".join(
        f"{'M' if index == 0 else 'L'} {point.split(',')[0]} {point.split(',')[1]}" for index, point in enumerate(chart_points)
    )
    chart_area_path = f"{chart_path} L {24 + (len(chart_values) - 1) * 52} 160 L 24 160 Z"

    payment_records = [
        {"id": "INV-4201", "client": "Northbridge Partners", "gateway": "Paystack", "amount": 4200},
        {"id": "INV-4202", "client": "Altitude Bio", "gateway": "Flutterwave", "amount": 6850},
        {"id": "INV-4203", "client": "KollraX Premium", "gateway": "Paystack", "amount": 2750},
    ]
    payment_statuses = {"INV-4201": "Paid", "INV-4202": "Processing", "INV-4203": "Pending"}
    subscription_assignments = {"INV-4201": "Enterprise", "INV-4202": "Premium", "INV-4203": "Growth"}
    subscription_plans = [
        {"plan": "Enterprise Plan", "health": 0.97},
        {"plan": "Business Plan", "health": 0.61},
        {"plan": "Starter Plan", "health": 0.48},
    ]
    permission_items = [
        "Role assignment controls are active for all organization members.",
        "Audit log monitoring is enabled for platform configuration changes.",
        "Security overview indicates no elevated administrative anomalies.",
    ]
    recent_activities = (
        [
            {
                "id": f"{ticket['id']}-{update['createdAt']}",
                "detail": update["message"],
                "createdAt": update["createdAt"],
            }
            for ticket in STATE["tickets"]
            for update in ticket["updates"]
        ]
    )
    recent_activities.sort(key=lambda item: item["createdAt"], reverse=True)
    recent_activities = recent_activities[:5]
    newest_users = sorted(STATE["users"], key=lambda item: item["createdAt"], reverse=True)[:3]
    notification_seed = [item["message"] for item in STATE["notifications"]]

    return {
        "title": "KollraX | Admin Control",
        "current_user": get_current_user(),
        "state": STATE,
        "active_clients": active_clients,
        "admin_users": admin_users,
        "users_with_avatars": users_with_avatars,
        "consultations": consultations,
        "open_consultations": len(STATE["leads"]),
        "open_tickets_count": open_tickets_count,
        "in_progress_tickets_count": in_progress_tickets_count,
        "enabled_services": enabled_services,
        "monthly_recurring_revenue": monthly_recurring_revenue,
        "chart_values": chart_values,
        "chart_labels": chart_labels,
        "chart_points": chart_points,
        "chart_path": chart_path,
        "chart_area_path": chart_area_path,
        "subscription_plans": subscription_plans,
        "payment_records": payment_records,
        "payment_statuses": payment_statuses,
        "subscription_assignments": subscription_assignments,
        "notification_items": notification_seed,
        "permission_items": permission_items,
        "recent_activities": recent_activities,
        "newest_users": newest_users,
    }


app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "69MA-s3papVHqng5RKgW-ilkZeBfzIltmV0y6N8LSTc")
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Configure CORS for API access from the frontend (Cloudflare Pages or other origins)
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
if allowed_origins.strip() == "*":
    CORS(app, supports_credentials=True)
else:
    origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]
    CORS(app, origins=origins, supports_credentials=True)


app.jinja_env.globals["icon"] = icon
app.jinja_env.filters["format_date"] = format_date
app.jinja_env.filters["format_currency"] = format_currency
app.jinja_env.filters["format_naira"] = format_naira


@app.context_processor
def inject_globals() -> dict[str, Any]:
    return {
        "current_user": get_current_user(),
        "year": datetime.utcnow().year,
        # API_BASE can be set via environment to the Railway or backend URL. Empty string uses relative URLs.
        "API_BASE": os.environ.get("API_BASE", ""),
    }


@app.route("/")
def marketing() -> Any:
    return render_template("marketing.html", **build_marketing_context())


@app.route("/plans", methods=["GET", "POST"], endpoint="plans")
def plan_selection() -> Any:
    # Allow public access to plan selection. Save chosen selection in session and continue to checkout.
    selection = {}
    if request.method == "POST":
        plan_key = normalize_plan_key(request.form.get("plan"))
        user_count = int(request.form.get("user_count", 3) or 3)
        addon_ids = request.form.getlist("addons")
        session["billing_selection"] = {
            "plan": plan_key,
            "user_count": user_count,
            "addons": [addon_id for addon_id in addon_ids if addon_id in BILLING_ADDONS],
        }
        return redirect(url_for("checkout"))

    if request.args.get("plan"):
        selection = {
            "plan": request.args.get("plan"),
            "user_count": request.args.get("users", session.get("billing_selection", {}).get("user_count", 3)),
            "addons": request.args.getlist("addons") or session.get("billing_selection", {}).get("addons", []),
        }

    selection = session.get("billing_selection", selection)
    return render_template("plans.html", **build_plan_selection_context(selection))


@app.route("/checkout", methods=["GET", "POST"])
def checkout() -> Any:
    selection = session.get("billing_selection")
    if not selection:
        return redirect(url_for("plan_selection"))

    if request.method == "POST":
        request_data = {
            "id": create_id("ORD"),
            "plan": normalize_plan_key(selection.get("plan")),
            "user_count": int(selection.get("user_count", 3) or 3),
            "addons": selection.get("addons", []),
            "fullName": request.form.get("fullName", "").strip(),
            "companyName": request.form.get("companyName", "").strip(),
            "email": request.form.get("email", "").strip(),
            "phone": request.form.get("phone", "").strip(),
            "businessSize": request.form.get("businessSize", "").strip(),
            "payment_method": request.form.get("payment_method", "stripe"),
            "createdAt": iso_now(),
            "status": "Pending payment",
        }
        STATE.setdefault("billing_requests", []).insert(0, request_data)
        try:
            save_state()
        except Exception:
            pass
        session["billing_request_id"] = request_data["id"]
        flash("Checkout structure saved. Connect Stripe or Paystack to complete payment.", "success")
        return render_template(
            "payment.html",
            **build_checkout_context(selection, request.form, completed=True),
            request_id=request_data["id"],
        )

    return render_template("payment.html", **build_checkout_context(selection))


@app.route("/contact", methods=["GET", "POST"])
def contact() -> Any:
    if request.method == "POST":
        needs = request.form.getlist("needs")
        lead = {
            "id": create_id("LD"),
            "name": request.form.get("name", "").strip(),
            "email": request.form.get("email", "").strip(),
            "phone": request.form.get("phone", "").strip(),
            "company": request.form.get("company", "").strip(),
            "staffSize": request.form.get("staffSize", "").strip(),
            "usesMicrosoft365": request.form.get("usesMicrosoft365", "Not sure"),
            "needs": needs,
            "budgetRange": request.form.get("budgetRange", "").strip(),
            "urgency": request.form.get("urgency", "Just exploring"),
            "focus": ", ".join(needs),
            "message": request.form.get("message", "").strip(),
            "stage": "New Lead",
            "owner": "Unassigned",
            "createdAt": iso_now(),
        }
        STATE["leads"].insert(0, lead)
        try:
            save_state()
        except Exception:
            pass
        flash("Request received. The lead has been added to the pipeline.", "success")
        return render_template("contact.html", **build_contact_context(request.form, done=True, submitted_lead=lead))

    return render_template("contact.html", **build_contact_context(request.form))


@app.route("/auth/register", methods=["GET", "POST"])
def register() -> Any:
    error = ""
    if request.method == "POST":
        full_name = request.form.get("fullName", "").strip()
        email = request.form.get("email", "").strip().lower()
        company = request.form.get("company", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not all([full_name, email, company, password, confirm_password]):
            error = "Please complete all fields to create your account."
        elif find_user_by_email(email):
            error = "An account with this email already exists. Please login instead."
        elif password != confirm_password:
            error = "Passwords do not match."
        else:
            country_code = request.form.get("country_code", "")
            phone = request.form.get("phone", "").strip()
            phone_value = f"{country_code}{phone}" if phone else ""
            user = {
                "id": create_id("USR"),
                "memberCode": create_member_code(),
                "fullName": full_name,
                "email": email,
                "password": password,
                "company": company,
                "phone": phone_value,
                "role": "client",
                "avatar": None,
                "createdAt": iso_now(),
            }
            STATE["users"].append(user)
            try:
                save_state()
            except Exception:
                pass
            session["user_id"] = user["id"]
            flash("Account created successfully. You can now choose your plan and continue to checkout.", "success")
            return redirect(url_for("dashboard"))

    return render_template("register.html", title="KollraX | Create account", error=error)


@app.route("/auth/login", methods=["GET", "POST"])
def login() -> Any:
    error = ""
    if request.method == "POST":
        user = find_user_by_email(request.form.get("email", ""))
        password = request.form.get("password", "")
        if not user or user["password"] != password:
            error = "Invalid credentials. Please check your email and password."
        else:
            session["user_id"] = user["id"]
            flash("Logged in successfully.", "success")
            if user["role"] == "admin":
                return redirect(url_for("admin_dashboard"))
            return redirect(url_for("dashboard"))

    return render_template("login.html", title="KollraX | Login", error=error)


@app.route("/auth/recover", methods=["GET", "POST"])
def recover() -> Any:
    message = ""
    if request.method == "POST":
        email = request.form.get("email", "")
        message = (
            "If this account exists, a secure recovery link has been prepared for delivery."
            if find_user_by_email(email)
            else "No account found for this email."
        )
    return render_template("recover.html", title="KollraX | Password Recovery", message=message)


@app.route("/auth/logout", methods=["POST"])
def logout() -> Any:
    session.clear()
    flash("Signed out.", "success")
    return redirect(url_for("marketing"))


@app.route("/dashboard", methods=["GET", "POST"])
def dashboard() -> Any:
    user = get_current_user()
    if not user:
        return redirect(url_for("login"))
    if user["role"] == "admin":
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":
        action = request.form.get("action")
        
        if action == "update_profile":
            user["fullName"] = request.form.get("fullName", user["fullName"]).strip() or user["fullName"]
            user["email"] = request.form.get("email", user["email"]).strip() or user["email"]
            user["company"] = request.form.get("company", user["company"]).strip() or user["company"]
            # combine country code and phone if provided
            country_code = request.form.get("country_code", "")
            phone = request.form.get("phone", "").strip()
            if phone:
                user["phone"] = f"{country_code}{phone}" if country_code else phone
            avatar_file = request.files.get("avatar")
            save_avatar_file(user, avatar_file)
            try:
                save_state()
            except Exception:
                pass
            flash("Profile updated successfully.", "success")
            return redirect(url_for("dashboard"))

        if action == "update_quote":
            plan_key = normalize_plan_key(request.form.get("plan"))
            user_count = int(request.form.get("user_count", "3") or 3)
            addon_ids = request.form.getlist("addons")
            session["billing_selection"] = {
                "plan": plan_key,
                "user_count": user_count,
                "addons": [addon_id for addon_id in addon_ids if addon_id in BILLING_ADDONS],
            }
            return redirect(url_for("checkout"))

        plan_key = normalize_plan_key(request.form.get("plan"))
        user_count = int(request.form.get("user_count", "3") or 3)
        addon_ids = request.form.getlist("addons")
        session["billing_selection"] = {
            "plan": plan_key,
            "user_count": user_count,
            "addons": [addon_id for addon_id in addon_ids if addon_id in BILLING_ADDONS],
        }
        return redirect(url_for("checkout"))

    selection = session.get("billing_selection", {})
    if request.args.get("plan"):
        selection = {
            "plan": request.args.get("plan"),
            "user_count": request.args.get("users", selection.get("user_count", 3)),
            "addons": request.args.getlist("addons") or selection.get("addons", []),
        }

    return render_template(
        "user_dashboard.html",
        current_user=user,
        **build_plan_selection_context(selection),
    )





@app.route("/admin", methods=["GET", "POST"])
def admin_dashboard() -> Any:
    user = get_current_user()
    if not user:
        return redirect(url_for("login"))
    if user["role"] != "admin":
        session.clear()
        return redirect(url_for("login"))

    notice = ""
    if request.method == "POST":
        action = request.form.get("action")
        if action == "update_ticket":
            ticket = find_ticket(request.form.get("ticket_id", ""))
            if ticket:
                ticket["status"] = request.form.get("status", ticket["status"])
                reply = request.form.get("reply", "").strip()
                if reply:
                    ticket["updates"].insert(
                        0,
                        {
                            "by": user["fullName"],
                            "role": "admin",
                            "message": reply,
                            "createdAt": iso_now(),
                        },
                    )
                notice = f"Ticket {ticket['id']} updated."
        elif action == "update_lead":
            lead = find_lead(request.form.get("lead_id", ""))
            if lead:
                lead["stage"] = request.form.get("stage", lead["stage"])
                lead["owner"] = request.form.get("owner", lead["owner"])
                notice = f"Lead {lead['id']} updated."
        elif action == "toggle_service":
            service = find_service(request.form.get("service_id", ""))
            if service:
                service["enabled"] = not service["enabled"]
                notice = f"{service['title']} updated."
        elif action == "send_notification":
            title = request.form.get("title", "").strip()
            message_text = request.form.get("message", "").strip()
            audience = request.form.get("audience", "All workspace users")
            if title and message_text:
                STATE["notifications"].insert(
                    0,
                    {
                        "id": create_id("notice"),
                        "title": title,
                        "message": message_text,
                        "audience": audience,
                    },
                )
                notice = "Notification created and added to the admin feed."
        elif action == "save_content":
            area = request.form.get("content_area", "")
            draft = request.form.get("draft", "").strip()
            if area and draft:
                STATE["content_entries"][area] = draft
                notice = f"{area} content draft saved."
        elif action == "admin_user_action":
            user_id = request.form.get("user_id", "")
            target = next((u for u in STATE["users"] if u.get("id") == user_id), None)
            if target:
                op = request.form.get("op")
                if op == "save":
                    new_role = request.form.get("role", target.get("role"))
                    target["role"] = new_role
                    notice = f"Updated role for {target.get('fullName')}"
                elif op == "toggle_active":
                    target["active"] = not target.get("active", True)
                    notice = f"Toggled active for {target.get('fullName')}"
        try:
            save_state()
        except Exception:
            pass
    context = build_admin_context()
    context["notice"] = notice
    return render_template("admin.html", **context)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
