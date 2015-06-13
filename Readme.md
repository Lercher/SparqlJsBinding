## SPARQL JS Binding

An [AngularJS](http://www.angularjs.org/) module to formulate SPARQL 1.1 queries 
in a more JavaScript'ish way. It's currently integrated with the RESTful 
Webservice of [BrightstarDB](http://www.brightstardb.com/). Has functions to store and retreive simple 
JavaScript objects in the RDF database.

*Note*

The language binding is in no ways complete. It covers only
basic triple based operations like:

* select, where, order by
* select distinct
* where optional
* prefixes
* strings and numbers as literals

To store and retrieve JS objects:

* only flat property/literal-value like objects
* arrays are stored and retrieved as sets (no order, no duplicates!)

Remember: RDF is all about resources and their respective links, so you have to make them
explicit. If you need to store complex object graphs without thinking, consider using JSON.stringify.


### The JS Language Binding Library - rdf.angular.js

Documentation is included only as comments in the file, 
but see also the sample application for an example application.


### Sample Application - ArticleApp.htm

This is a sample HTML5 application that uses the library. 

* create articles
* add some metadata like abstract and title
* tag them
* markdown as body language
* save them in a BrightstarDB RDF store
* list and filter them by tags or metadata content

To run the application locally you need to do some things first:

1. Download and install BrightstarDB version at least 1.11 

2. Create a store named "Article"

3. Store ArticleApp.htm, rdf.angular.js and marked.min.js in
the same folder.

4. Fire off ArticleApp.htm in your preferred html5 capable browser

5. Hit "Metadata", "Edit Content", fill out the fields and hit "Save"


### Markdown Parser - marked.min.js

This [library](https://github.com/chjj/marked) is used by the sample application to transform 
markdown source code to proper html.



## Angular services

Some brief description of the provided Angular services.

### sparql

Main service to construct SPARQL query functions.

### sparql$http

Create promises to

* Query a b* store
* Store a flat JS object to the RDF store
* retrieve a flat JS object from the RDF store

### brightstardb

Just a configuration point to build URLs to access BrightstarDB's
Query and Update endpoints for a particular store.



## Sample Code Fragments

Now some code fragments showing the use of the library


### Setting up the BrightstarDB Server and Store

```
  brightstardb.config.server = "bs.somedomain.com";
  brightstardb.config.store = "Article";
```

### Defining some prefixes

```
  var idPrefix = sparql.prefix("o", "http://www.brightstardb.com/example/article/");
  var propertyPrefix = sparql.prefix("", "http://www.brightstardb.com/example/article#", ["title", "abstr", "tags"])
  var a = sparql.a;
```

## Query

### State a query with an unbound TAG

```
  var unboundTag = sparql.unbound("TAG");
  var articlelist = sparql.vars("res", "title", "abstr");
  var articlelistQY = sparql(propertyPrefix).select(sparql.distinct, articlelist).where(
    [articlelist.res, a, idPrefix._asResource],
    [articlelist.res, propertyPrefix.title, articlelist.title],
    [articlelist.res, propertyPrefix.abstr, articlelist.abstr],
    [articlelist.res, propertyPrefix.tags, unboundTag]
  ).orderBy(articlelist.res.desc);
```


### Bind TAG to $scope.tagfilter and load the results as a list

```
      sparql$http(articlelistQY({TAG: $scope.tagfilter})).then(
        function(data){ $scope.L = data; },
        function(reason){ $scope.L = null; stderr(reason);});
```


## Store

### Prepare a store with a given property schema and a type for the object

```
  var update = sparql.update(propertyPrefix, idPrefix._asResource);
```

### Store a flat object $scope.A under the ID $scope.A.$ID

```
    sparql$http(update($scope.A.$ID, $scope.A)).then(
      function(rdf) { /* OK */ },
      function(reason) { stderr(reason); }
```


## Retrieve

### Prepare a retrieve with a given property schema and a type for the object

```
var retrieve = sparql.retrieve(propertyPrefix, idPrefix._asResource);
```

### Get a promise, res is the ID of the article as string

```
    var articleResource = sparql.resource(res);
    sparql$http(retrieve(articleResource)).then(
      function(art) { $scope.A = art; },
      function (reason) { $scope.A = null; stderr(reason); }
    );
```
