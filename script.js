// Weather App Configuration
const API_KEY = '7e2c00e660f987df4cd0ef1deba673c5'; // Replace with your actual API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const weatherDisplay = document.getElementById('weatherDisplay');
const recentSearches = document.getElementById('recentSearches');
const recentCities = document.getElementById('recentCities');

// Weather Display Elements
const cityName = document.getElementById('cityName');
const country = document.getElementById('country');
const currentDate = document.getElementById('currentDate');
const currentTemp = document.getElementById('currentTemp');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDescription = document.getElementById('weatherDescription');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecastContainer');

// State
let currentUnit = 'metric'; // metric for Celsius, imperial for Fahrenheit
let currentWeatherData = null;
let recentCitiesList = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function () {
    loadRecentCities();
    displayRecentCities();
    updateCurrentDate();

    // Load last searched city if exists
    const lastCity = localStorage.getItem('lastSearchedCity');
    if (lastCity) {
        cityInput.value = lastCity;
        searchWeather(lastCity);
    }
});

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', getCurrentLocation);
celsiusBtn.addEventListener('click', () => changeUnit('metric'));
fahrenheitBtn.addEventListener('click', () => changeUnit('imperial'));

cityInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Search Functions
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        searchWeather(city);
    }
}

async function searchWeather(city) {
    try {
        showLoading();
        hideError();

        const weatherData = await fetchWeatherData(city);
        const forecastData = await fetchForecastData(city);

        currentWeatherData = weatherData;

        displayWeatherData(weatherData);
        displayForecastData(forecastData);

        // Save to recent searches
        addToRecentCities(city);
        localStorage.setItem('lastSearchedCity', city);

        hideLoading();
        showWeatherDisplay();

    } catch (error) {
        hideLoading();
        showError(error.message);
        console.error('Weather search error:', error);
    }
}

async function fetchWeatherData(city) {
    const response = await fetch(
        `${API_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found. Please check the spelling and try again.');
        } else if (response.status === 401) {
            throw new Error('Invalid API key. Please check your configuration.');
        } else {
            throw new Error('Failed to fetch weather data. Please try again later.');
        }
    }

    return await response.json();
}

async function fetchForecastData(city) {
    const response = await fetch(
        `${API_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
    }

    return await response.json();
}

// Geolocation
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const weatherData = await fetchWeatherByCoords(latitude, longitude);
                    const forecastData = await fetchForecastByCoords(latitude, longitude);

                    currentWeatherData = weatherData;

                    displayWeatherData(weatherData);
                    displayForecastData(forecastData);

                    cityInput.value = weatherData.name;
                    addToRecentCities(weatherData.name);

                    hideLoading();
                    showWeatherDisplay();

                } catch (error) {
                    hideLoading();
                    showError('Failed to get weather for your location');
                }
            },
            (error) => {
                hideLoading();
                showError('Location access denied. Please search for a city manually.');
            }
        );
    } else {
        showError('Geolocation is not supported by this browser');
    }
}

async function fetchWeatherByCoords(lat, lon) {
    const response = await fetch(
        `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch weather data');
    }

    return await response.json();
}

async function fetchForecastByCoords(lat, lon) {
    const response = await fetch(
        `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
    }

    return await response.json();
}

// Display Functions
function displayWeatherData(data) {
    cityName.textContent = data.name;
    country.textContent = data.sys.country;

    const temperature = Math.round(data.main.temp);
    currentTemp.textContent = temperature;

    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = data.weather[0].description;

    weatherDescription.textContent = data.weather[0].description;

    const feelsLikeTemp = Math.round(data.main.feels_like);
    const unit = currentUnit === 'metric' ? '°C' : '°F';
    feelsLike.textContent = `${feelsLikeTemp}${unit}`;

    humidity.textContent = `${data.main.humidity}%`;

    const windSpeedValue = Math.round(data.wind.speed * (currentUnit === 'metric' ? 3.6 : 1));
    const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    windSpeed.textContent = `${windSpeedValue} ${windUnit}`;

    pressure.textContent = `${data.main.pressure} hPa`;

    // Update unit display
    document.querySelectorAll('.unit').forEach(el => {
        el.textContent = unit;
    });
}

function displayForecastData(data) {
    forecastContainer.innerHTML = '';

    // Get forecast for next 5 days (every 24 hours)
    const dailyForecasts = [];
    const processedDates = new Set();

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();

        if (!processedDates.has(dateString) && dailyForecasts.length < 5) {
            dailyForecasts.push(item);
            processedDates.add(dateString);
        }
    });

    dailyForecasts.forEach(forecast => {
        const forecastItem = createForecastItem(forecast);
        forecastContainer.appendChild(forecastItem);
    });
}

function createForecastItem(forecast) {
    const date = new Date(forecast.dt * 1000);
    const dayName = date.toLocaleDateString('en', { weekday: 'short' });
    const temp = Math.round(forecast.main.temp);
    const unit = currentUnit === 'metric' ? '°C' : '°F';
    const iconCode = forecast.weather[0].icon;
    const description = forecast.weather[0].description;

    const forecastItem = document.createElement('div');
    forecastItem.className = 'forecast-item';

    forecastItem.innerHTML = `
        <div class="day">${dayName}</div>
        <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${description}">
        <div class="temp">${temp}${unit}</div>
        <div class="description">${description}</div>
    `;

    return forecastItem;
}

// Unit Conversion
function changeUnit(unit) {
    if (unit === currentUnit) return;

    currentUnit = unit;

    // Update button states
    celsiusBtn.classList.toggle('active', unit === 'metric');
    fahrenheitBtn.classList.toggle('active', unit === 'imperial');

    // Re-fetch data with new unit if we have current weather data
    if (currentWeatherData) {
        const city = currentWeatherData.name;
        searchWeather(city);
    }
}

// Recent Cities Management
function addToRecentCities(city) {
    // Remove if already exists
    recentCitiesList = recentCitiesList.filter(c => c.toLowerCase() !== city.toLowerCase());

    // Add to beginning
    recentCitiesList.unshift(city);

    // Keep only last 5 cities
    recentCitiesList = recentCitiesList.slice(0, 5);

    localStorage.setItem('recentCities', JSON.stringify(recentCitiesList));
    displayRecentCities();
}

function loadRecentCities() {
    const saved = localStorage.getItem('recentCities');
    if (saved) {
        recentCitiesList = JSON.parse(saved);
    }
}

function displayRecentCities() {
    if (recentCitiesList.length === 0) {
        recentSearches.style.display = 'none';
        return;
    }

    recentSearches.style.display = 'block';
    recentCities.innerHTML = '';

    recentCitiesList.forEach(city => {
        const cityElement = document.createElement('div');
        cityElement.className = 'recent-city';
        cityElement.textContent = city;
        cityElement.addEventListener('click', () => {
            cityInput.value = city;
            searchWeather(city);
        });
        recentCities.appendChild(cityElement);
    });
}

// Utility Functions
function updateCurrentDate() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    currentDate.textContent = now.toLocaleDateString('en-US', options);
}

function showLoading() {
    loading.style.display = 'block';
    weatherDisplay.style.display = 'none';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    weatherDisplay.style.display = 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showWeatherDisplay() {
    weatherDisplay.style.display = 'block';
}

// Error Handling for API Key
if (API_KEY === 'YOUR_API_KEY_HERE') {
    showError('Please replace YOUR_API_KEY_HERE with your actual OpenWeatherMap API key in the script.js file.');
}
// Clear History Functionality
// Initialize Clear Button when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeClearButton();
});

function initializeClearButton() {
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearHistory);
        console.log('Clear button initialized!');
    } else {
        console.log('Clear button not found!');
    }
}

function clearHistory() {
    console.log('Clear history clicked!'); // check
    
    // Clear the array
    if (typeof recentCitiesList !== 'undefined') {
        recentCitiesList = [];
    }
    
    // Clear localStorage
    localStorage.removeItem('recentCities');
    
    // Hide the recent searches section
    const recentSection = document.getElementById('recentSearches');
    if (recentSection) {
        recentSection.style.display = 'none';
    }
    
    console.log('History cleared successfully!');
}
