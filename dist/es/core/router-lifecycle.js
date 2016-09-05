import constants, { errorCodes } from '../constants';

var noop = function noop() {};

export default function withRouterLifecycle(router) {
    var started = false;
    var options = router.getOptions();

    router.isStarted = isStarted;
    router.start = start;
    router.stop = stop;

    function isStarted() {
        return started;
    }

    function start() {
        var lastArg = arguments.length <= arguments.length - 1 + 0 ? undefined : arguments[arguments.length - 1 + 0];
        var done = typeof lastArg === 'function' ? lastArg : noop;
        var startPathOrState = typeof (arguments.length <= 0 ? undefined : arguments[0]) !== 'function' ? arguments.length <= 0 ? undefined : arguments[0] : undefined;

        if (started) {
            done({ code: errorCodes.ROUTER_ALREADY_STARTED });
            return router;
        }

        var startPath = void 0,
            startState = void 0;

        started = true;
        router.invokeEventListeners(constants.ROUTER_START);

        // callback
        var cb = function cb(err, state) {
            var invokeErrCb = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

            if (!err) router.invokeEventListeners(constants.TRANSITION_SUCCESS, state, null, { replace: true });
            if (err && invokeErrCb) router.invokeEventListeners(constants.TRANSITION_ERROR, state, null, err);
            done(err, state);
        };

        if (startPathOrState === undefined && !options.defaultRoute) {
            return cb({ code: errorCodes.NO_START_PATH_OR_STATE });
        }if (typeof startPathOrState === 'string') {
            startPath = startPathOrState;
        } else if ((typeof startPathOrState === 'undefined' ? 'undefined' : babelHelpers.typeof(startPathOrState)) === 'object') {
            startState = startPathOrState;
        }

        if (!startState) {
            (function () {
                // If no supplied start state, get start state
                startState = startPath === undefined ? null : router.matchPath(startPath);
                // Navigate to default function
                var navigateToDefault = function navigateToDefault() {
                    return router.navigateToDefault({ replace: true }, done);
                };
                var redirect = function redirect(route) {
                    return router.navigate(route.name, route.params, { replace: true, reload: true }, done);
                };
                // If matched start path
                if (startState) {
                    router.transitionToState(startState, router.getState(), {}, function (err, state) {
                        if (!err) cb(null, state);else if (err.redirect) redirect(err.redirect);else if (options.defaultRoute) navigateToDefault();else cb(err, null, false);
                    });
                } else if (options.defaultRoute) {
                    // If default, navigate to default
                    navigateToDefault();
                } else if (options.allowNotFound) {
                    cb(null, router.makeNotFoundState(startPath));
                } else {
                    // No start match, no default => do nothing
                    cb({ code: errorCodes.ROUTE_NOT_FOUND, path: startPath }, null);
                }
            })();
        } else {
            // Initialise router with provided start state
            router.setState(startState);
            done(null, startState);
        }

        return router;
    }

    function stop() {
        if (started) {
            router.setState(null);
            started = false;
            router.invokeEventListeners(constants.ROUTER_STOP);
        }

        return router;
    }
}