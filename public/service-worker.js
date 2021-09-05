////////////////////////////////////////////////////////////
// Service Worker:
// This js file only runs the first time the site is loaded.
// This file is used to register (i.e., install) a service worker.

////////////////////////////////////////////////////
// a list of static files needed to start the application
// notice how the files are css, js and icons, any logos or parts of the UI
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/assets/css/style.css",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/assets/images/icons/icon-192x192.png",
    "/assets/images/icons/icon-512x512.png",
  ];
  
  /////////////////////////////////////////////////
  // Label the application caches
  // you can have as many as you want. How many is correct? Think about strategies for
  // cleaning caches: what would trigger your need to clean out caches?
  //
  // When you want to force a cache clean, change the name of your cache (notice the v2?)
  
  // This will cache static assets that are downloaded as part of running our application
  // i.e., images we load as part of our gallery
  const CACHE_NAME = "static-cache-v2";
  
  // this will cache responses the app recieves as a result of our api requests
  const DATA_CACHE_NAME = "data-cache-v1";
  
  //////////////////////////////////////////////////
  // Runs when the service worker is installed
  self.addEventListener("install", function (evt) {
    // this is an ExtendableEvent (https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent)
    evt.waitUntil(
      // Open the file cache and add our essential static files
      caches.open(CACHE_NAME).then((cache) => {
        console.log("Your files were pre-cached successfully!");
        return cache.addAll(FILES_TO_CACHE);
      })
    );
  
    // A service worker installation has to wait until all open windows
    // to your site are finished working. This line essentially bypasses
    // that wait.
    self.skipWaiting();
  });
  
  // After installation, there is an activation event. The primary use of
  // onactivate is for cleanup of resources used in previous versions of a
  // Service worker script
  self.addEventListener("activate", function (evt) {
    evt.waitUntil(
      // step through each of our caches. This may include old versions (see the cache names at
      // the top of this file). So this function looks for caches not named above and removes them
      caches.keys().then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
              console.log("Removing old cache data", key);
              return caches.delete(key);
            }
          })
        );
      })
    );
  
    // when a page first loads, before the service worker is installed, the page itself is not
    // considered under the control of the service worker and is not really subject to the
    // benefits of having one. This line of code fixes that and makes sure the service worker
    // is in control of the page
    self.clients.claim();
  });
  
  /////////////////////////////////////////////////////////////////////
  // Handle fetch events
  //
  // Since the main point of having a service worker is to manage our
  // access to resources from remote locations, this listens for any request
  // made by our client application and decides whether to use a cached resource
  // or go get it from the remote location
  self.addEventListener("fetch", function (evt) {
    // cache successful requests to the API
    if (evt.request.url.includes("/api/")) {
      // this is a FetchEvent (https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith)
      evt.respondWith(
        // Open the data cache
        caches
          .open(DATA_CACHE_NAME)
          .then((cache) => {
            // perform the remote api fetch...
            return fetch(evt.request)
              .then((response) => {
                // If the response was good, clone it and store it in the cache.
                if (response.status === 200) {
                  // the cache is a key-value look up. The key is the request url, the value is the response
                  // which should be a JSON object
                  cache.put(evt.request.url, response.clone());
                }
  
                // return the response back to our application
                return response;
              })
              .catch((err) => {
                // Network request failed, try to get it from the cache.
                return cache.match(evt.request);
              });
          })
          .catch((err) => console.log(err))
      );
  
      return;
    }
  
    // if the request is not for the API, serve static assets using "offline-first" approach.
    // see https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#cache-falling-back-to-network
    evt.respondWith(
      caches.match(evt.request).then(function (response) {
        return response || fetch(evt.request);
      })
    );
  });
  