## SPARQL JS Binding

An [AngularJS](http://www.angularjs.org/) module to formulate SPARQL 1.1 queries 
in a more JavaScript'ish way. It's currently integrated with the RESTful 
Webservice of [Blackhole](https://github.com/Lercher/blackhole). Has functions to store and retreive simple 
JavaScript objects in the RDF database.

*Note:* The language binding is in no ways complete. It covers only
basic triple based operations like:

* select, where, order by
* select distinct
* where with optional triples
* prefixes and resources
* strings and numbers as literals

To store and retrieve JS objects:

* only flat property/literal-or-resource-value like JS objects
* with a rdf:type
* array properties are stored and retrieved as sets (no order, no duplicates!)

*Please remember:* RDF is all about resources and their respective links, so you have to make them
explicit with store and retrieve. If you need to store complex object graphs *without* thinking, 
consider using JSON.stringify.


## Licensing

My work, i.e. the language binding and the sample app are provided under the MIT license. 
They are free to use for both commercial and non-commercial purposes. The Markdown parser 
and the Blackhole Server have their own licensing. At the time of creation of this repository, 
i.e. mid 2015 they were both open source.


## Files in the repository

### The JS Language Binding Library - rdf.angular.js

Documentation is included only as comments in the file, 
but see also the sample application for an example.


### Sample Application - ArticleApp.htm

This is a sample HTML5 application that uses the library. 

* create articles
* add some metadata like abstract and title
* tag them
* markdown as body language
* save them in a Blackhole RDF store
* list and filter them by tags or metadata content

To run the application locally you need to do some things first:

1. Download and install Blackhole. N.B. Blackhole needs a local MS SQL Server.

2. Create a store named "Article"

3. Store ArticleApp.htm, rdf.angular.js and marked.min.js in
the same folder.

4. Fire off ArticleApp.htm in your preferred html5 capable browser

5. Hit "Metadata", "Edit Content", fill out the fields and hit "Save"


### Markdown Parser - marked.min.js

This [library](https://github.com/chjj/marked) is used by the sample application to transform 
markdown source code to proper html.



## Angular services

A brief description of the four provided Angular services:

* sparql
* sparql$http
* brightstardb
* blackhole

### sparql

Main service to construct SPARQL query functions.

### sparql$http

Create promises to

* Query a b* store
* Store a flat JS object to the RDF store
* retrieve a flat JS object from the RDF store

### brightstardb

A configuration point to build URLs to access BrightstarDB's
Query and Update endpoints for a particular store.

### blackhole

A configuration point to build URLs to access Blackhole's
Query and Update endpoints for a particular store.


## Sample Code Fragments

Code fragments showing the use of the library


### Setting up the BrightstarDB Server and Store

```javascript
brightstardb.config.server = "bs.somedomain.com";
brightstardb.config.store = "Article";
```

### Setting up the Blackhole Server and Store

```javascript
blackhole.config.server = "bs.somedomain.com";
blackhole.config.store = "Article";
```

### Defining some prefixes

```javascript
// a prefix for Object IDs
var idPrefix = sparql.prefix("o", "http://www.brightstardb.com/example/article/");

// a prefix for their properties
var propertyPrefix = sparql.prefix("", "http://www.brightstardb.com/example/article#", 
   ["title", "abstr", "tags"])

var a = sparql.a; // standard abbreviation for rdf:type
```

## Query

State prefixes, variables and triples to form a query function. 
Retrieve a promise to an array of the results.


### State a query with an unbound named "TAG"

Unbounds can and must be provided later when you post the query to the REST service. 
The query function (here: articlelistQY) can be stored for later reuse.
Triples in the .where() function are stated as arrays with three elements.
Optional triples are enclosed with the sparql.optional() function (not shown here).

```javascript
var unboundTag = sparql.unbound("TAG");
var articlelist = sparql.vars("res", "title", "abstr"); // define the variables
var articlelistQY = sparql(propertyPrefix).select(sparql.distinct, articlelist).where(
	[articlelist.res, a, idPrefix._asResource], // type triple
	[articlelist.res, propertyPrefix.title, articlelist.title], // standard s p o triple
	[articlelist.res, propertyPrefix.abstr, articlelist.abstr], // standard s p o triple
	[articlelist.res, propertyPrefix.tags, unboundTag] // the o position is bound later
).orderBy(articlelist.res.desc); // order by res descending ;-)
```


### Bind TAG to $scope.tagfilter and load the results to the list $scope.L

$scope.tagfilter is either a sparql variable or a sparql.literal() here.

```javascript
sparql$http(articlelistQY({TAG: $scope.tagfilter})).then(
        function(data){ $scope.L = data; },
        function(reason){ $scope.L = null; stderr(reason);});
```


## Store

Store a flat JS object under an ID and with a type in the RDF store. 
IDs and the type are of course RDF resources. The JS object property names are combined
with the propertyPrefix to form proper predicate resources.

### Prepare a store with a given property schema and a type for the object

You need an RDF prefix for the properties to be stored
and an RDF type resource for the object, which is the second parameter here.
The resulting update function can be reused.

```javascript
var update = sparql.update(propertyPrefix, idPrefix._asResource);
```

### Store a flat object 

The object to store is $scope.A and it is stored under 
the ID $scope.A.$ID witch is a sparql.resource() (not shown here).

```javascript
sparql$http(update($scope.A.$ID, $scope.A)).then(
      function(rdf) { /* OK */ },
      function(reason) { stderr(reason); }
```


## Retrieve

The reverse operation of Store


### Prepare a retrieve with a given property schema and a type for the object

The retrieve function can be reused. Prefix and type parameters as in Store.

```javascript
var retrieve = sparql.retrieve(propertyPrefix, idPrefix._asResource);
```

### Get a promise to the loaded JS object

res is the ID of the article as a string so it has to be converted to an RDF resource first.

```javascript
var articleResource = sparql.resource(res);
sparql$http(retrieve(articleResource)).then(
      function(art) { $scope.A = art; },
      function (reason) { $scope.A = null; stderr(reason); }
);
```
