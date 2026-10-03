/**
 * Utility functions for safe formatting of values
 */

/**
 * Safely format a number using toLocaleString with fallback
 * @param {number|null|undefined} value - The value to format
 * @param {string} fallback - The fallback value if input is invalid (default: '0')
 * @returns {string} Formatted number string
 */
export const safeFormatNumber = (value, fallback = '0') => {
  try {
    if (value === null || value === undefined) {
      return fallback;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return fallback;
    }
    return num.toLocaleString();
  } catch (error) {
    console.warn('Error formatting number:', error);
    return fallback;
  }
};

/**
 * Safely format a number as currency (with rupee symbol)
 * @param {number|null|undefined} value - The value to format
 * @param {string} fallback - The fallback value if input is invalid (default: '₹0')
 * @returns {string} Formatted currency string with rupee symbol
 */
export const safeFormatCurrency = (value, fallback = '₹0') => {
  try {
    if (value === null || value === undefined) {
      return fallback;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return fallback;
    }
    return `₹${num.toLocaleString()}`;
  } catch (error) {
    console.warn('Error formatting currency:', error);
    return fallback;
  }
};

/**
 * Safely extract and format a nested object property
 * @param {object} obj - The object to extract from
 * @param {string} path - The path to the property (e.g., 'overview.totalEarnings')
 * @param {number} defaultValue - The default value if property doesn't exist (default: 0)
 * @returns {number} The extracted value or default
 */
export const safeGetNumber = (obj, path, defaultValue = 0) => {
  try {
    if (!obj || !path) return defaultValue;
    const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  } catch (error) {
    console.warn('Error getting nested number:', error);
    return defaultValue;
  }
};

/**
 * Safely extract and format a nested object property as formatted number
 * @param {object} obj - The object to extract from
 * @param {string} path - The path to the property (e.g., 'overview.totalEarnings')
 * @param {string} fallback - The fallback value if property doesn't exist (default: '0')
 * @returns {string} The formatted number string or fallback
 */
export const safeFormatPath = (obj, path, fallback = '0') => {
  try {
    const value = safeGetNumber(obj, path);
    return safeFormatNumber(value, fallback);
  } catch (error) {
    console.warn('Error formatting path:', error);
    return fallback;
  }
};
