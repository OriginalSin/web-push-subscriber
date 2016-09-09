A simple library that helps you manage and send subscriptions and unsubscriptions for
web push notifications services using leveldb.

# How to use

	~~~~
	export GCM_API_KEY=YOURKEY
	var wsub = require( 'web-push-subscriber' );
	wsub.subscribe( 'firefox', 'feature', 'token_a' );
	wsub.subscribe( 'google', 'feature', 'token_b' );
	wsub.ping( 'google', ['token_b'], 'feature' )
	wsub.broadcast( 'feature' ) ~~~~


