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

describe('subscribe', function() {
  var result, result2;
  subscriber.subscribe( 'google', 'feature', '0' );
  subscriber.subscribe( 'google', 'another-feature', '1' );
  subscriber.subscribe( 'firefox', 'feature', '2' );
  subscriber.subscribe( 'firefox', 'feature', '3' );

  beforeEach(function(done){
    subscriber.getSubscribers( 'feature', 'google' ).then( function ( res ) {
      result = res;
      done();
    } );
  });

  beforeEach(function(done){
    subscriber.getSubscribers( 'feature', 'firefox' ).then( function ( res ) {
      result2 = res;
      done();
    } );
  });

  it('only returns ids of the browser and feature asked for', function() {
    assert.ok( result.length, 1, 'One subscriber.' );
    assert.ok( result[0], '0', 'with token 0' );
  });

  it('gives me all tokens subscribed for firefox browser', function() {
    assert.ok( result2.length, 2, 'Two subscribers.' );
    assert.ok( result2[0], '2' );
    assert.ok( result2[1], '3' );
  });
});

describe('unsubscribe', function() {
  var result;

  subscriber.subscribe( 'google', 'feature-2', '0' );
  subscriber.subscribe( 'google', 'feature-2', '1' );
  subscriber.unsubscribe( 'google', 'feature-2', '0' );

  beforeEach(function(done){
    subscriber.getSubscribers( 'feature-2', 'google' ).then( function ( res ) {
      result = res;
      done();
    } );
  });

  it('respects my unsubscription', function() {
    assert.ok( result.length, 1 );
    assert.ok( result[0], '1' );
  });
});
