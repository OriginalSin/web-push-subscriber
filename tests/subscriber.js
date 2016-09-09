var subscriber = require( './../index.js' );
var assert = require( 'assert' );

describe('ping', function() {
  it('pings the right people with the right amount of requests when browser is firefox', function() {
    var pings = subscriber.ping( 'test-firefox', [ 'token', 'token2' ], 'test-feature' );
    assert.ok( pings[0], 2, 'Two requests were made.' );
    assert.ok( pings[1], 2, 'Two people got pinged.' );
  });

  it('pings the right people with the right amount of requests when browser is google', function() {
    var pings = subscriber.ping( 'test-google', [ 'token', 'token2' ], 'test-feature' );
    assert.ok( pings[0], 1, 'One request was made (50 ids per request).' );
    assert.ok( pings[1], 2, 'Two people got pinged.' );
  });
});

