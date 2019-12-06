let restaurants, neighbourhoods, cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighbourhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.register("../serviceworker.js")
			.then(registration => {
				// Registration was successful
				console.log(
					"ServiceWorker registered, scope: ",
					registration.scope
				);
			})
			.catch(error => {
				// registration failed
				console.log(
					"ServiceWorker registration failed: ",
					error
				);
			});
	}

	initMap();
	fetchneighbourhoods();
	fetchCuisines();
});

/**
 * Fetch all neighbourhoods and set their HTML.
 */
fetchneighbourhoods = () => {
	DBHelper.fetchneighbourhoods((error, neighbourhoods) => {
		if (error) {
			// Got an error
			console.error(error);
		} else {
			self.neighbourhoods = neighbourhoods;
			fillneighbourhoodsHTML();
		}
	});
};

/**
 * Set neighbourhoods HTML.
 */
fillneighbourhoodsHTML = (neighbourhoods = self.neighbourhoods) => {
	const select = document.getElementById("neighbourhoods-select");
	neighbourhoods.forEach(neighbourhood => {
		const option = document.createElement("option");
		option.innerHTML = neighbourhood;
		option.value = neighbourhood;
		select.append(option);
	});
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
	DBHelper.fetchCuisines((error, cuisines) => {
		if (error) {
			// Got an error!
			console.error(error);
		} else {
			self.cuisines = cuisines;
			fillCuisinesHTML();
		}
	});
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
	const select = document.getElementById("cuisines-select");

	cuisines.forEach(cuisine => {
		const option = document.createElement("option");
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
	self.newMap = L.map("map", {
		center: [40.722216, -73.987501],
		zoom: 12,
		scrollWheelZoom: false
	});
	L.tileLayer(
		"https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",
		{
			mapboxToken:
				"pk.eyJ1IjoibG9mdHk2NDUiLCJhIjoiY2szam9hMTk1MGw2czNibG1tOG1kM2o0ZyJ9.LxCM7Fqy_lu_oeC2OVoZPQ",
			maxZoom: 18,
			attribution:
				'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
				'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
				'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
			id: "mapbox.streets"
		}
	).addTo(newMap);

	updateRestaurants();
	document.getElementById("map").tabIndex = "-1";
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
	const cSelect = document.getElementById("cuisines-select");
	const nSelect = document.getElementById("neighbourhoods-select");

	const cIndex = cSelect.selectedIndex;
	const nIndex = nSelect.selectedIndex;

	const cuisine = cSelect[cIndex].value;
	const neighbourhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndneighbourhood(
		cuisine,
		neighbourhood,
		(error, restaurants) => {
			if (error) {
				// Got an error!
				console.error(error);
			} else {
				resetRestaurants(restaurants);
				fillRestaurantsHTML();
			}
		}
	);
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
	// Remove all restaurants
	self.restaurants = [];
	const ul = document.getElementById("restaurants-list");
	ul.innerHTML = "";

	// Remove all map markers
	self.markers.forEach(m => m.setMap(null));
	self.markers = [];
	self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
	const ul = document.getElementById("restaurants-list");
	restaurants.forEach(restaurant => {
		ul.append(createRestaurantHTML(restaurant));
	});
	addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = restaurant => {
	const li = document.createElement("li");

	const link = document.createElement("a");
	// link.innerHTML = 'View Details';
	link.href = DBHelper.urlForRestaurant(restaurant);
	link.className = restaurant.cuisine_type.toLowerCase();
	link.setAttribute(
		"aria-label",
		"Details of " +
			restaurant.name +
			" restaurant, " +
			restaurant.neighbourhood
	);
	link.tabIndex = "0";
	li.append(link);

	const image = document.createElement("img");
	image.className = "restaurant-img";
	image.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.alt = "Image of " + restaurant.name + " restaurant";
	link.append(image);

	const label = document.createElement("div");
	label.className = "restaurant-label";
	link.append(label);

	const name = document.createElement("h1");
	name.className = "restaurant-name";
	name.innerHTML = restaurant.name;
	label.append(name);

	const neighbourhood = document.createElement("p");
	neighbourhood.innerHTML = restaurant.neighbourhood;
	label.append(neighbourhood);

	const address = document.createElement("p");
	address.className = "restaurant-address";
	address.innerHTML = restaurant.address;
	label.append(address);

	const hr = document.createElement("hr");
	label.append(hr);

	const rating = document.createElement("span");
	rating.className = "rating";
	rating.innerHTML = "Rating: " + restaurantRating(restaurant); //'rating';
	label.append(rating);

	const type = document.createElement("span");
	type.className = "cuisine-type";
	type.innerHTML = restaurant.cuisine_type;
	label.append(type);

	return li;
};

restaurantRating = restaurant => {
	let reviews = restaurant.reviews.map(r => r.rating);
	let rating = reviews.reduce((a, b) => a + b, 0) / reviews.length;
	rating = rating.toFixed(1);

	return rating;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
	restaurants.forEach(restaurant => {
		// Add marker to the map
		const marker = DBHelper.mapMarkerForRestaurant(
			restaurant,
			self.newMap
		);
		marker.on("click", onClick);
		function onClick() {
			window.location.href = marker.options.url;
		}
	});
};
