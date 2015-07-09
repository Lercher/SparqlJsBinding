// ****************************************************************************
// an angular module for the brightstardb sparql services
// Martin Lercher
// ****************************************************************************
// <a href="http://www.angularjs.org">AngularJS</a>
// <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular.js"></script>
// SPARQL: http://www.w3.org/TR/rdf-sparql-query/
////////////////////////////// TODO ///////////////////////////////////////
// much more ...
///////////////////////////////////////////////////////////////////////////

angular.module("rdf", [])

.factory("sparql$http", ["$q", "$http", "blackhole", function($q, $http, brightstardb) {

    // sparql$http( aRetrieve | anUpdate | aQuery )
    // aRetrieve | anUpdate | aQuery - standard objects created by the sparql service
    // -> returns a promise for
    //    when retrieve: the retrieved flat object
    //    when update: the rdf transcript
    //    when query: the query result as JS object
    // rejects with reason after an $http error or if the parameter type is not expected
    // notifies about status, if an error occured
    return function(q) {
        // see https://lostechies.com/gabrielschenker/2014/02/04/angularjspart-11-promises/
        // and http://www.peterbe.com/plog/promises-with-$http
        // $q - https://docs.angularjs.org/api/ng/service/$q
        // $http.post - see https://docs.angularjs.org/api/ng/service/$http

        var deferred = $q.defer();
        if (angular.isDefined(q.create)) {
            // we want to load a flat JS object
            $http.post(brightstardb(), q.query)
                .success(function(data) {
                    var obj = q.create(data);
                    deferred.resolve(obj);
                })
                .error(function(data, status, headers, config){
                    deferred.notify(status);
                    deferred.reject("Error " + status + ": " + data.statusMessage + "\nin\n" + config.data.Update);
                })
        } else if (angular.isDefined(q.Update)) {
            // we want to store a flat JS Object
            $http.post(brightstardb.update(), q)
                .success(function(data, status, headers, config){
                    deferred.resolve(config.data.Update);
                })
                .error(function(data, status, headers, config){
                    deferred.notify(status);
                    deferred.reject("Error " + status + ": " + data.statusMessage + "\nin\n" + config.data.Update);
                })
        } else if (angular.isDefined(q.query)) {
            // just load a query
            $http.post(brightstardb(), q)
                .success(function(data, status, headers, config){
                    deferred.resolve(data);
                })
                .error(function(data, status, headers, config){
                    deferred.notify(status);
                    deferred.reject("Error " + status + ": " + data + "\nin\n" + config.data.query);
                })
        } else {
            deferred.reject("Only queries, updates and retrieves are allowed for the sparql$http service.");
        }
        return deferred.promise;
    }
}])

.factory("sparql", [function() {
    var _spc = " ";
    var _pusher = Array.prototype.push; // see http://jsperf.com/concat-vs-push-apply/10
    function _wrap(s) {
        return {_sparql: s}
    }
    function _unwrap(v) {
        if (angular.isUndefined(v)) return v;
        if (angular.isUndefined(v._sparql)) return v;
        return v._sparql;
    }
    function _unwrap_spc(v) {
        if (angular.isUndefined(v)) return v;
        if (angular.isUndefined(v._sparql)) return v+" ";
        return v._sparql;
    }
    function escape(s) {
        return JSON.stringify(s);
    }
    function literal(e) {
        // _wrap a string/number as a string/number literal if not yet _wrap-ed
        if (angular.isString(e)) return _wrap(escape(e));
        if (angular.isNumber(e)) return _wrap(""+e);
        if (angular.isUndefined(e._sparql)) throw "only strings and numbers can be sparql literals yet";
        return e;
    }
    function arryfy(a) {
        // make an array if it isn't one yet.
        if (angular.isArray(a)) return a;
        if (angular.isUndefined(a)) return [];
        return [a];
    }
    function flatten(a,f) {
        // look in array a, all members are unwrapped and
        // then any array member gets expanded into the result array r
        // then r is mapped memberwise by f
        var r=[];
        a = arryfy(a);
        for(i=0;i<a.length;i++)
        {
            var ar_ai = arryfy(_unwrap(a[i]));
            _pusher.apply(r,ar_ai);
        }
        if (f) for(i=0;i<r.length;i++) {
            r[i] = f(r[i]);
        }
        return r;
    }
    function _build(prefixes, vs, triples, order) {
        // prepare the unbound SPARQL query, which is an array of tokens and {unbound: name} objects
        var a = [prefixes, "\nSELECT ", vs, "\nWHERE {\n", triples, "}\n"];
        if (!angular.isUndefined(order)) {
            a.push("ORDER BY");
            for (var i=0; i<order.length; i++) {
                a.push(_spc);
                a.push(order[i]);
            }
            a.push("\n");
        }
        a = flatten(a, _unwrap);
        return a;
    }
    function _binder(a) {
        // captures the prepared query a, returns a function
        // that replaces each {unbound: nameN} element with it's
        // value from {name1: aString|aNumber|aLiteral|aVar|aLiteralResource|aPrefixedResource, name2: ...}
        // and returns the bound query text as {query: "SELECT ... WHERE { ... } ..."}
        return function(values) {
            var ar = [];
            for (var i=0; i<a.length; i++) {
                if (angular.isObject(a[i]) && a[i].unbound) {
                    ar[i] = _unwrap(literal(values[a[i].unbound]));
                } else {
                    ar[i] = a[i];
                }
            }
            return { query: ar.join("") }
        }
    }
    function _triple(targetArray, tripleArray) {
        // transform a triple [t,t,t] into a seq of tokens
        var t = arryfy(tripleArray);
        var tt = [
            _spc,
            _spc, _unwrap(literal(t[0])),
            _spc, _unwrap(literal(t[1])),
            _spc, _unwrap(literal(t[2])),
            " .\n"];
        _pusher.apply(targetArray, tt);
    }

    // here starts the main service sparql which is a function with attributes
    // called as sparql(p, p, p, ...).select(vars.v, vars, ...).where([t,t,t], optional([t,t,t], ...), ...).orderBy(vars.v, vars.v.desc, ...)(b)
    // returning an object {query: <sparql-query-text>}
    // where p is aPrefix, vars is aVarsList, vars.v is aVar
    // where optional(...) is anOptionalTripleList
    // where t is aString | aNumber | aLiteral | aVar | aLiteralResource | aPrefixedResource | anUnboundName
    // where b is an object with the current values for all unbound names as {name1: t, name2: t, ...}
    // wherein t is as above, except anUnboundName of course
    var sparql = function(/*prefixes*/) {
        var prefixes = []; _pusher.apply(prefixes, arguments);
        prefixes = flatten(prefixes, _unwrap);
        return { select: function(/*vss*/) {
            var vss=[]; _pusher.apply(vss, arguments);
            var vs = flatten(vss, _unwrap_spc);
            return { where: function(/*triples, optional(triples)*/) {
                var triples = [];
                for (var i=0; i<arguments.length; i++) {
                    if (angular.isArray(arguments[i])) {
                        _triple(triples, arguments[i]);
                    } else {
                        _pusher.apply(triples, _unwrap(arguments[i])); // e.g. optional
                    }
                }
                var ret = _binder(_build(prefixes, vs, triples));
                ret.orderBy = function(/*orderbys*/) {
                    var orderbys=[]; _pusher.apply(orderbys, arguments);
                    //todo
                    return _binder(_build(prefixes, vs, triples, orderbys))
                }
                return ret;
            }}
        }};
    }
    // for SELECT distinct
    sparql.distinct = _wrap("DISTINCT");
    // creates anOptionalTripleList
    sparql.optional = function(/*triples*/) {
        var opts=["  OPTIONAL {\n"];
        for (var i=0; i<arguments.length; i++) {
            opts.push("  ");
            _triple(opts, arguments[i]);
        }
        opts.push("  }\n");
        return _wrap(opts);
    }
    // creates aLiteralResource
    sparql.resource = function(uri) {
        return _wrap("<"+uri+">");
    }
    // creates aLiteral from a string or a number
    sparql.literal = literal;
    // creates aVarsList from a list of strings
    // var vars = sparql.vars("a", "b", "c")
    // defines-> vars.a, vars.b, vars.c
    // defines-> vars.a.desc, vars.b.desc, vars.c.desc
    sparql.vars = function(/*vs*/) {
        var vs = []; _pusher.apply(vs, arguments);
        var v = _wrap([]);
        for(var i=0; i<vs.length; i++) {
            var vn = vs[i];
            var $vn="$"+vn
            v[vn]=_wrap($vn);
            v[vn].desc=_wrap("desc("+$vn+")");
            v._sparql.push($vn);
        }
        return v;
    }
    // creates aPrefix
    // var p = sparql.prefix("p", "http://example.com/#", ["n1", "n2"])
    // defines-> p.n1, p.n2 (as p:n1 and p:n2)
    // defines-> p("s") (as p:s)
    sparql.prefix = function(prefix,uri,es) {
        es = es || [];
        var p = function(en) {
            var r = _wrap(prefix+":"+en)
            r._uri = uri + en;
            r._asResource = sparql.resource(r._uri);
            return r;
        };
        for(var i=0; i<es.length; i++) {
            var en = es[i];
            p[en]=p(en);
        }
        p._asResource = sparql.resource(uri);
        p._sparql = "PREFIX "+prefix+": "+_unwrap(p._asResource)+"\n";
        p._prefix = prefix;
        p._extract = function(URI) {
            if (URI.indexOf(uri)===0) {
                return URI.substring(uri.length);
            }
            return undefined;
        }
        return p;
    }
    // creates anUnboundName, which has no sparql equivalent but is convenient for mixing queries with JS variables.
    // it can be used in a triple to be bound later to a JS provided value.
    sparql.unbound = function(elementName) {
        return _wrap({unbound: elementName});
    }

    // ----------------------------------------------------------------
    // some wellknown predefined prefixes, see http://www.w3.org/TR/rdf-schema/
    // ----------------------------------------------------------------

    // sparql.rdf as aPrefix
    sparql.rdf  = sparql.prefix("rdf",  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            ["HTML", "XMLLiteral", "PlainLiteral", "Property", "Statement", "Bag", "Seq", "Alt", "List",
             "langString", "type", "subject", "predicate", "object", "value", "nil", "first", "rest"]
    );
    // sparql.rdfs as aPrefix
    sparql.rdfs = sparql.prefix("rdfs", "http://www.w3.org/2000/01/rdf-schema#",
            ["Resource", "Class", "Literal", "Container", "ContainerMembershipProperty", "Datatype",
             "subClassOf", "subPropertyOf", "comment", "label", "domain", "range", "seeAlso", "isDefinedBy", "member"]
    );
    // sparql.a as the special shortcut a for http://www.w3.org/1999/02/22-rdf-syntax-ns#type aka rdf:type
    sparql.a = _wrap("a");
    // sparql.wildcard - a resource that matches any value in the delete part of a b* sparcle update post
    sparql.wildcard = sparql.resource("http://www.brightstardb.com/.well-known/model/wildcard");
    sparql.useWildcard = false; // it only works with the brightstar RDF client API which the REST service doesn't support.

    // ----------------------------------------------------------------
    // sparql update and retrieve for flat JS objects
    // ----------------------------------------------------------------

    // sparql.update(propertyPrefix, type)
    // propertyPrefix - a sparql.prefix() for the property names of the object to store
    // type - typically a sparql.resource() identifing the type of the object to store
    //        should be the resource specified in an idPrefix
    // -> returns a function(ID, OBJ)
    //    ID - object identification of OBJ, should be a proper rdf resource
    //    OBJ - flat object to store. It's own properties will be combined with propertyPrefix to form a resource
    //          properties starting with $ will be ignored
    //          properties can be aString | aNumber | aLiteral | aLiteralResource | aPrefixedResource
    //          and flat ARRAYs of these types without duplicates and without order
    //          if you need duplicates and preserved order, consider using an associative array with ordered keys instead
    //          array properties are marked with the rdf.Bag type
    //    -> returns {Update: "sparql update string"}
    //       which deletes the previous type and all properties of the current OBJ
    //       and then stores the new type and OBJ properties under the resource ID
    //       arrays are stored as many rdf-objects under the same rdf-predicate
    //       so when reading these arrays it is not guaranteed that the order is preserved
    sparql.update = function(propertyPrefix, type) {
        return function(ID, aFlatObject) {
            var wrapedType = literal(type);
            var names = [];
            var arrys = [];
            for (p in aFlatObject) {
                if (aFlatObject.hasOwnProperty(p) && p[0] !== "$") {
                    names.push(p);
                    if (angular.isArray(aFlatObject[p])) {
                        arrys.push(p);
                    }
                }
            }
            var wc = sparql.useWildcard ? function() { return sparql.wildcard; } : angular.identity;

            var deletes = [
                _spc, _spc, ID, _spc, sparql.a, _spc, wc("$t"),
                " ; ", sparql.rdf.Bag, _spc, wc("$b"), " ;\n    "
            ];
            var i;
            for (i=0; i<names.length; i++) {
                var nameDel = propertyPrefix(names[i]);
                if (i>0) {
                    deletes.push(" ;  ");
                }
                var rDel = [nameDel, _spc, wc("$a"+i)];
                _pusher.apply(deletes, rDel);
            };
            deletes.push(" .\n");

            var inserts = [_spc, _spc, ID, _spc, sparql.a, _spc, wrapedType];
            for (i=0; i<arrys.length; i++) {
                var nameBag = propertyPrefix(arrys[i]);
                Bags = [" ;\n    ", sparql.rdf.Bag, _spc, nameBag];
                _pusher.apply(inserts, Bags);
            }
            for (i=0; i<names.length; i++) {
                var nameIns = propertyPrefix(names[i]);
                var val = aFlatObject[names[i]];
                val = arryfy(val);
                for (var index=0; index<val.length; index++) {
                    var lit = literal(val[index]);
                    var r = [" ;\n    ", nameIns, _spc, lit];
                    _pusher.apply(inserts, r);
                }
            };
            inserts.push(" .\n");

            var all;
            if (sparql.useWildcard) {
                all = [
                    sparql.rdf,
                    propertyPrefix,
                    "DELETE DATA {\n",
                        deletes,
                    "} ;\n",
                    "INSERT DATA {\n",
                        inserts,
                    "}",
                ];
            } else {
                all = [
                    sparql.rdf,
                    propertyPrefix,
                    "DELETE {\n",
                        deletes,
                    "}\n",
                    "WHERE {",
                        deletes,
                    "} ;\n",
                    "INSERT DATA {\n",
                        inserts,
                    "}",
                ];
            }
            var ar = flatten(all, _unwrap);
            return {Update: ar.join("")};
        }
    }

    sparql.retrieve = function(propertyPrefix, type) {
        var v = sparql.vars("p", "o");
        var unboundID = sparql.unbound("ID");
        var qy = sparql().select(v).where(
            [unboundID, sparql.a, type],
            [unboundID, v.p, v.o]
        )
        return function(ID) {
            function isBag(r) {
                return (r.type==="uri" && r.value===sparql.rdf.Bag._uri);
            }
            function parse(data) {
                var o = {$ID: ID};
                var bs = data.results.bindings;
                var prop, i;
                // make arrays from rdf:Bag
                for(i=0; i<bs.length; i++)
                {
                    if (isBag(bs[i].p)) {
                        prop = propertyPrefix._extract(bs[i].o.value);
                        o[prop] = [];
                    }
                }
                // make other properties from ?p ?o that are compatible with propertyPrefix
                for(i=0; i<bs.length; i++)
                {
                    if (!isBag(bs[i].p)) {
                        prop = propertyPrefix._extract(bs[i].p.value);
                        if (prop) {
                            var val = bs[i].o.value;
                            if (angular.isArray(o[prop])) {
                                o[prop].push(val);
                            } else {
                                o[prop] = val;
                            }
                        }
                    }
                }
                return o;
            }
            return {
                query: qy({ID: ID}),
                create: parse
            }
        }
    }
    sparql.arryfy = arryfy;
    return sparql;
}])

.factory("brightstardb", [function() {
    var config = {
        protocol: "http",
        server: "localhost",
        port: 8090,
        resultAs: "json",
        store: "Default"
    }
    var r = function()
    {
        return config.protocol+"://"+config.server+":"+config.port+"/brightstar/" + config.store + "/sparql."+config.resultAs;
    };
    r.update = function() {
        return config.protocol+"://"+config.server+":"+config.port+"/brightstar/" + config.store + "/update";
    }
    r.config = config;
    return r;
}])

.factory("blackhole", [function() {
    var config = {
        protocol: "http",
        server: "localhost",
        port: 8090,
        resultAs: "json",
        store: "Default"
    }
    var r = function()
    {
        return config.protocol+"://"+config.server+":"+config.port+"/blackhole/Query/" + config.store + "." +config.resultAs + "/";
    };
    r.update = function() {
        return config.protocol+"://"+config.server+":"+config.port+"/blackhole/Update/" + config.store + "/";
    }
    r.config = config;
    return r;
}])

;