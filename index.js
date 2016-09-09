var level = require('level');
var db = level('./mydb');
var fetch = require('node-fetch');

/**
 * Checks whether we have support for the given provider
 *
 * @param {String} provider of push notifications (firefox or chrome)
 * @returns {Boolean} whether we support it or not
 */
function isKnownProvider( provider ) {
	return provider === 'google' || provider === 'firefox';
}

/**
 * Triggers push notifications to registered workers
 *
 * @param {String} provider of push notifications (firefox or chrome)
 * @param {Array} of ids that need push notifications sent to them
 * @param [{String}] feature name for the worker being pushed to, when used stale subscriptions will be removed
 */
function ping( provider, ids, feature ) {
	var i, endpoint, pingedIds, noop,
		requests = 0,
		pinged = 0,
		body = {},
		headers = {
			'TTL': 60,
			'Content-Type': 'application/json'
		};

	// Assume google if not given
	provider = provider || 'google';
	if ( provider.indexOf( 'test-' ) === 0 ) {
		provider = provider.substr(5);
		noop = true;
	}

	function doUnsubscriptions ( data ) {
		if ( feature && data.unsubscribe ) {
			data.unsubscribe.forEach( function ( subscription ) {
				unsubscribe( provider, feature, subscription );
			} );
		}
	}

	if ( provider === 'google' ) {
		endpoint = 'https://android.googleapis.com/gcm/send';
		headers.Authorization = "key=" + process.env.GCM_API_KEY;
		// send them 50 at a time
		for( i = 0; i < ids.length; i = i + 50 ) {
			pingedIds = ids.slice(i, 50);
			body = JSON.stringify( {
				"registration_ids": pingedIds
			} );
			if ( !noop ) {
				pingEndpoint( endpoint, headers, body, pingedIds ).then( doUnsubscriptions );
			}
			pinged += pingedIds.length;
			requests += 1;
		}
	} else if ( provider === 'firefox' ) {
		for( i = 0; i < ids.length; i++ ) {
			endpoint = 'https://updates.push.services.mozilla.com/push/' + ids[i];
			if ( !noop ) {
				pingEndpoint( endpoint, headers, null, [ ids[i] ] ).then( doUnsubscriptions );
			}
			requests += 1;
			pinged += 1;
		}
	} else {
		throw 'Endpoint is unknown: ' + provider;
	}
	return [ requests, pinged ];
}

/**
 * Pings an endpoint with headers and bodys
 *
 * @param {String} url to ping
 * @param {Headers} headers for request
 * @param {String} body of request
 * @param {String[]} ids of subscription in order used within the endpoint URL and/or headers
 */
function pingEndpoint( endpoint, headers, body, ids ) {
	var stale = [], params = {
		method: 'post',
		headers: headers,
		body: body
	};
	if ( headers ) {
		params.headers = headers;
	}
	if ( body ) {
		params.body = body;
	}
	return fetch( endpoint, params ).then( function ( r ) {
		// If 404 assume was not a bad URL but bad single ID given to firefox
		if ( [ 404, 400, 410 ].indexOf( r.status ) > -1 && ids.length === 1 ) {
			stale.push( ids[0] );
			return {
				unsubscribe: stale
			};
		}
		return r.json();
	} ).then( function ( json ) {
		if ( json && json.results ) {
			// Deal with bad subscriptions to Chrome
			json.results.forEach( function ( item, i ) {
				if ( item.error ) {
					stale.push( ids[i] );
				}
			} );
		}
		return {
			unsubscribe: stale
		};
	} );
}

/**
 * For a given feature sends push notifications to all subscribers
 *
 * @param {String} feature
 * @param {String} provider
 */
function broadcastForEndpoint( feature, provider ) {
	var prefix,
		index = 3,
		ids = [];

	// provider may be absent for backwards compatibility reasons
	if ( provider ) {
		index = 2;
		prefix = provider + '!';
	}

	getSubscribers( feature, provider ).then( function ( ids ) {
		ping( provider, ids, feature );
		console.log( 'web-push-subscriber pinged ' + ids.length + ' subscribers' );
	} );
}

/**
 * For a given feature get the subscribers
 *
 * @param {String} feature
 * @param {String} provider
 */
function getSubscribers( feature, provider ) {
	var prefix,
		index = 3,
		ids = [];

	// provider may be absent for backwards compatibility reasons
	if ( provider ) {
		index = 2;
		prefix = provider + '!';
	}

	return new Promise( function ( resolve ) {
		db.createReadStream( {
				gt: prefix + feature + '!',
				 // stop at the last key with the prefix
				lt: prefix + feature + '\xFF'
			} ).on( 'data', function ( data ) {
				var id = data.key.split( '!' )[ index ];
				if ( !id ) {
					// bad data so cleanup
					db.del( data.key );
				}
				ids.push( id );
			} ).on( 'end', function () {
				resolve( ids );
			} );
	} );
}


/**
 * Broadcast to all subscribers that a current feature has had updates
 *
 * @param {String} feature
 */
function broadcast( feature ) {
	// for backwards compatibility
	broadcastForEndpoint( feature, '' );
	broadcastForEndpoint( feature, 'google' );
	broadcastForEndpoint( feature, 'firefox' );
}

/**
 * Add a subscription
 *
 * @param {String} provider
 * @param {String} feature
 * @param {String} id
 * @param {Function} errhandler what to do when things go wrong
 */
function subscribe( provider, feature, id, errhandler ) {
	if ( !isKnownProvider( provider ) ) {
		throw 'Unknown provider'  + provider;
	}
	db.put( provider + '!' + feature + '!' + id, Date.now(), errhandler );
}

/**
 * Remove a subscription
 *
 * @param {String} provider
 * @param {String} feature
 * @param {String} id
 * @param {Function} errhandler what to do when things go wrong
 */
function unsubscribe( provider, feature, id, errhandler ) {
	if ( !isKnownProvider( provider ) ) {
		throw 'Unknown provider'  + provider;
	}
	db.del( provider + '!' + feature + '!' + id, errhandler );
}

module.exports = {
	getSubscribers: getSubscribers,
	subscribe: subscribe,
	unsubscribe: unsubscribe,
	ping: ping,
	broadcast: broadcast
};
