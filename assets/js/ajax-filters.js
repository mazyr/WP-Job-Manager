/* global job_manager_ajax_filters */
jQuery( document ).ready( function ( $ ) {

	var xhr = [];

	$( '.job_listings' ).on( 'update_results', function ( event, page, append, loading_previous ) {
		var data         = '';
		var target       = $( this );
		var form         = target.find( '.job_filters' );
		var showing      = target.find( '.showing_jobs' );
		var results      = target.find( '.job_listings' );
		var per_page     = target.data( 'per_page' );
		var orderby      = target.data( 'orderby' );
		var order        = target.data( 'order' );
		var featured     = target.data( 'featured' );
		var filled       = target.data( 'filled' );
		var job_types    = target.data( 'job_types' );
		var post_status  = target.data( 'post_status' );
		var index        = $( 'div.job_listings' ).index(this);
		var categories, keywords, location;

		if ( index < 0 ) {
			return;
		}

		if ( xhr[index] ) {
			xhr[index].abort();
		}

		if ( true === target.data( 'show_filters' ) ) {

			var filter_job_type = [];

			$( ':input[name="filter_job_type[]"]:checked, :input[name="filter_job_type[]"][type="hidden"], :input[name="filter_job_type"]', form ).each( function () {
				filter_job_type.push( $( this ).val() );
			} );

			categories = form.find( ':input[name^="search_categories"]' ).map( function () {
				return $( this ).val();
			} ).get();
			keywords   = '';
			location   = '';
			var $keywords  = form.find( ':input[name="search_keywords"]' );
			var $location  = form.find( ':input[name="search_location"]' );

			// Workaround placeholder scripts
			if ( $keywords.val() !== $keywords.attr( 'placeholder' ) ) {
				keywords = $keywords.val();
			}

			if ( $location.val() !== $location.attr( 'placeholder' ) ) {
				location = $location.val();
			}

			data = {
				lang: job_manager_ajax_filters.lang,
				search_keywords: keywords,
				search_location: location,
				search_categories: categories,
				filter_job_type: filter_job_type,
				filter_post_status: post_status,
				per_page: per_page,
				orderby: orderby,
				order: order,
				page: page,
				featured: featured,
				filled: filled,
				show_pagination: target.data( 'show_pagination' ),
				form_data: form.serialize()
			};

		} else {

			categories = target.data( 'categories' );
			keywords   = target.data( 'keywords' );
			location   = target.data( 'location' );

			if ( categories ) {
				if ( typeof categories !== 'string' ) {
					categories = String( categories );
				}
				categories = categories.split( ',' );
			}

			data = {
				lang: job_manager_ajax_filters.lang,
				search_categories: categories,
				search_keywords: keywords,
				search_location: location,
				filter_post_status: post_status,
				filter_job_type: job_types,
				per_page: per_page,
				orderby: orderby,
				order: order,
				page: page,
				featured: featured,
				filled: filled,
				show_pagination: target.data( 'show_pagination' )
			};

		}

		xhr[index] = $.ajax( {
			type: 'POST',
			url: job_manager_ajax_filters.ajax_url.toString().replace( '%%endpoint%%', 'get_listings' ),
			data: data,
			success: function ( result ) {
				if ( result ) {
					try {
						if ( result.showing ) {
							var showing_el = jQuery('<span>').html(result.showing);
							$( showing ).show().html( '').html(result.showing_links).prepend(showing_el);
						} else {
							$( showing ).hide();
						}

						if ( result.showing_all ) {
							$( showing ).addClass( 'wp-job-manager-showing-all' );
						} else {
							$( showing ).removeClass( 'wp-job-manager-showing-all' );
						}

						if ( result.html ) {
							if ( append && loading_previous ) {
								$( results ).prepend( result.html );
							} else if ( append ) {
								$( results ).append( result.html );
							} else {
								$( results ).html( result.html );
							}
						}

						if ( true === target.data( 'show_pagination' ) ) {
							target.find('.job-manager-pagination').remove();

							if ( result.pagination ) {
								target.append( result.pagination );
							}
						} else {
							if ( ! result.found_jobs || result.max_num_pages <= page ) {
								$( '.load_more_jobs:not(.load_previous)', target ).hide();
							} else if ( ! loading_previous ) {
								$( '.load_more_jobs', target ).show();
							}
							$( '.load_more_jobs', target ).removeClass( 'loading' );
							$( 'li.job_listing', results ).css( 'visibility', 'visible' );
						}

						$( results ).removeClass( 'loading' );

						target.triggerHandler( 'updated_results', result );

					} catch ( err ) {
						if ( window.console ) {
							window.console.log( err );
						}
					}
				}
			},
			error: function ( jqXHR, textStatus, error ) {
				if ( window.console && 'abort' !== textStatus ) {
					window.console.log( textStatus + ': ' + error );
				}
			},
			statusCode: {
				404: function() {
					if ( window.console ) {
						window.console.log( 'Error 404: Ajax Endpoint cannot be reached. Go to Settings > Permalinks and save to resolve.' );
					}
				}
			}
		} );
	} );

	$( '#search_keywords, #search_location, .job_types :input, #search_categories, .job-manager-filter' ).change( function() {
		var target   = $( this ).closest( 'div.job_listings' );
		target.triggerHandler( 'update_results', [ 1, false ] );
		job_manager_store_state( target, 1 );
	} )

	.on( 'keyup', function(e) {
		if ( e.which === 13 ) {
			$( this ).trigger( 'change' );
		}
	} );

	$( '.job_filters' ).on( 'click', '.reset', function () {
		var target = $( this ).closest( 'div.job_listings' );
		var form = $( this ).closest( 'form' );

		form.find( ':input[name="search_keywords"], :input[name="search_location"], .job-manager-filter' ).not(':input[type="hidden"]').val( '' ).trigger( 'change.select2' );
		form.find( ':input[name^="search_categories"]' ).not(':input[type="hidden"]').val( '' ).trigger( 'change.select2' );
		$( ':input[name="filter_job_type[]"]', form ).not(':input[type="hidden"]').attr( 'checked', 'checked' );

		target.triggerHandler( 'reset' );
		target.triggerHandler( 'update_results', [ 1, false ] );
		job_manager_store_state( target, 1 );

		return false;
	} );

	$( document.body ).on( 'click', '.load_more_jobs', function() {
		var target           = $( this ).closest( 'div.job_listings' );
		var page             = parseInt( ( $( this ).data( 'page' ) || 1 ), 10 );
		var loading_previous = false;

		$(this).addClass( 'loading' );

		if ( $(this).is('.load_previous') ) {
			page             = page - 1;
			loading_previous = true;
			if ( page === 1 ) {
				$(this).remove();
			} else {
				$( this ).data( 'page', page );
			}
		} else {
			page = page + 1;
			$( this ).data( 'page', page );
			job_manager_store_state( target, page );
		}

		target.triggerHandler( 'update_results', [ page, true, loading_previous ] );
		return false;
	} );

	$( 'div.job_listings' ).on( 'click', '.job-manager-pagination a', function() {
		var target = $( this ).closest( 'div.job_listings' );
		var page   = $( this ).data( 'page' );

		job_manager_store_state( target, page );

		target.triggerHandler( 'update_results', [ page, false ] );

		$( 'body, html' ).animate({
			scrollTop: target.offset().top
		}, 600 );

		return false;
	} );

	if ( $.isFunction( $.fn.select2 ) ) {
		var select2_args = {
			allowClear: true,
			minimumResultsForSearch: 10
		};
		if ( 1 === parseInt( job_manager_ajax_filters.is_rtl, 10 ) ) {
			select2_args.dir = 'rtl';
		}
		$( 'select[name^="search_categories"]:visible' ).select2( select2_args );
	}

	var $supports_html5_history = false;
	if ( window.history && window.history.pushState ) {
		$supports_html5_history = true;
	}

	var location = document.location.href.split('#')[0];

	function job_manager_store_state( target, page ) {
		if ( $supports_html5_history ) {
			var form  = target.find( '.job_filters' );
			var data  = $( form ).serialize();
			var index = $( 'div.job_listings' ).index( target );
			window.history.replaceState( { id: 'job_manager_state', page: page, data: data, index: index }, '', location + '#s=1' );
		}
	}

	// Inital job and form population
	$(window).on( 'load', function() {
		$( '.job_filters' ).each( function() {
			var target      = $( this ).closest( 'div.job_listings' );
			var form        = target.find( '.job_filters' );
			var inital_page = 1;
			var index       = $( 'div.job_listings' ).index( target );

			if ( window.history.state && window.location.hash ) {
				var state = window.history.state;
				if ( state.id && 'job_manager_state' === state.id && index === state.index ) {
					inital_page = state.page;
					form.deserialize( state.data );
					form.find( ':input[name^="search_categories"]' ).not(':input[type="hidden"]').trigger( 'change.select2' );
				}
			}

			target.triggerHandler( 'update_results', [ inital_page, false ] );
		});
	});
} );
