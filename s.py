import json
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Configuration
INSTAGRAM_URL = "https://www.instagram.com/"
COOKIES_FILE = "cookies.json"
WAIT_TIME_FOR_MANUAL_LOGIN = 30  # seconds

def get_driver():
    options = Options()
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36")
    # options.add_argument("--headless")  # Avoid headless for Instagram
    return webdriver.Chrome(options=options)

def save_cookies(driver, path):
    with open(path, "w") as f:
        json.dump(driver.get_cookies(), f)
    print("✅ Cookies saved.")

def load_cookies(driver, path):
    with open(path, "r") as f:
        cookies = json.load(f)
    for cookie in cookies:
        if 'expiry' in cookie:
            del cookie['expiry']  # Optional: avoids expiry error
        driver.add_cookie(cookie)

def login_and_save():
    driver = get_driver()
    driver.get(f"{INSTAGRAM_URL}accounts/login/")
    print(f"⏳ Waiting {WAIT_TIME_FOR_MANUAL_LOGIN} seconds for manual login...")
    time.sleep(WAIT_TIME_FOR_MANUAL_LOGIN)
    save_cookies(driver, COOKIES_FILE)
    driver.quit()

def load_session():
    driver = get_driver()
    driver.get(INSTAGRAM_URL)
    time.sleep(5)
    load_cookies(driver, COOKIES_FILE)
    driver.get(INSTAGRAM_URL)  # Reload to apply cookies
    print("✅ Logged in using saved session.")
    time.sleep(10)
    driver.quit()

if __name__ == "__main__":
    if os.path.exists(COOKIES_FILE):
        print("🍪 Cookie file found, using saved session...")
        load_session()
    else:
        print("🔑 No cookies found, launching manual login...")
        login_and_save()
