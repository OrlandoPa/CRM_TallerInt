import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import path from 'path';
import fs from 'fs';

/**
 * Removes stale lock files from Chrome profile directory if present
 * @param {string} profilePath 
 */
function cleanStaleLockFiles(profilePath) {
  try {
    if (fs.existsSync(profilePath)) {
      const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
      for (const file of lockFiles) {
        const fullPath = path.join(profilePath, file);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch {
            // Ignore if currently held by active process
          }
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Creates and configures a Selenium WebDriver Chrome instance.
 * Automatically handles profile locking issues on Windows with graceful fallback.
 * 
 * @param {Object} options Configuration options
 * @param {boolean} [options.headless] Whether to run Chrome in headless mode
 * @param {boolean} [options.usePersistentProfile] Whether to keep saved session cookies
 * @returns {Promise<import('selenium-webdriver').WebDriver>}
 */
export async function createDriver(options = {}) {
  const isHeadless = options.headless !== undefined 
    ? options.headless 
    : (process.env.HEADLESS === 'true');

  const usePersistentProfile = options.usePersistentProfile !== false;

  const buildOptions = (profileDir) => {
    const chromeOpts = new chrome.Options();
    
    if (isHeadless) {
      chromeOpts.addArguments('--headless=new');
    } else {
      chromeOpts.addArguments('--start-maximized');
    }
    
    chromeOpts.addArguments('--no-sandbox');
    chromeOpts.addArguments('--disable-dev-shm-usage');
    chromeOpts.addArguments('--disable-gpu');
    chromeOpts.addArguments('--lang=es-ES');
    chromeOpts.addArguments('--disable-blink-features=AutomationControlled');
    chromeOpts.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    chromeOpts.excludeSwitches('enable-automation');

    if (profileDir) {
      chromeOpts.addArguments(`--user-data-dir=${profileDir}`);
    }

    return chromeOpts;
  };

  const primaryProfilePath = path.resolve(process.cwd(), 'tests', 'e2e', '.chrome-user-data');
  
  if (usePersistentProfile) {
    cleanStaleLockFiles(primaryProfilePath);
  }

  let driver = null;

  // Intento 1: Usar perfil persistente principal
  if (usePersistentProfile) {
    try {
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(buildOptions(primaryProfilePath))
        .build();
    } catch (err) {
      console.log('   ℹ️ El perfil principal de Chrome estaba bloqueado por otro proceso. Utilizando perfil secundario de respaldo...');
      const fallbackProfilePath = path.resolve(process.cwd(), 'tests', 'e2e', `.chrome-user-data-temp-${Date.now()}`);
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(buildOptions(fallbackProfilePath))
        .build();
    }
  } else {
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(buildOptions(null))
      .build();
  }

  // Set default implicit wait timeout
  await driver.manage().setTimeouts({ implicit: 5000 });

  if (!isHeadless) {
    try {
      await driver.manage().window().maximize();
    } catch {
      // Ignore if maximized flag already handled window size
    }
  }

  return driver;
}

/**
 * Pauses execution for visual demonstration
 * @param {import('selenium-webdriver').WebDriver} driver 
 * @param {number} ms 
 */
export async function pause(driver, ms = 1500) {
  await driver.sleep(ms);
}

export { By, until };
