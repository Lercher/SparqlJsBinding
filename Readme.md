## SPARQL JS Binding

An AngularJS module to formulate SPARQL queries 
in a more JavaScript'ish way. It's currently integrated with the RESTful 
Webservice of BrightstarDB. Has functions to store and retreive simple 
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

1 Download and install BrightstarDB version at least 1.11 

2 Create a store named "Article"

3 Store ArticleApp.htm, rdf.angular.js and marked.min.js in
the same folder.

4 Fire off ArticleApp.htm in your preferred html5 capable browser

5 Hit "Metadata", "Edit Content", fill out the fields and hit "Save"


### Markdown Parser - marked.min.js

This library is used by the sample application to transform 
markdown source code to proper html.
