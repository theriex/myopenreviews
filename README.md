membic
======

A membic is a bite sized structured summary of a noteworthy
experience. Membic.com is a site allowing you to easily make a membic
anytime you discover something worth remembering.  Functionally,
membic.com consists of a JavaScript web application supported by a
REST API coded in Python and hosted on Google App Engine.


Getting involved:
----------------

All comments, questions, suggestions, requests are welcome.  This is a
community site that wants your input, whether you are coming from a
technical background or not.  Contact theriex either via github or
gmail to say hello.  It would be great to hear any impressions you
have of the site and/or the project.


Code organization:
-----------------

For the web app, you can trace the flow from `index.html` into
`app.js` and/or search the codebase directly for any text that drew
your attention.  The app is pure JavaScript.  For an architecture
overview, see http://sandservices.com/docs/funcjsarch.html

To get into things from the server side REST API, start from
`app.yaml` to see what the endpoints are, then reference the
corresponding `.py` file in `src/py` for the implementation.

For local development, you will need to install the Google App Engine SDK.
  

Using the API:
-------------

Feel free to call the REST API directly, but PLEASE DO NOT BATCH
REQUESTS!  This is a fledgling site and after about a 1000 membics the
whole thing will run out of resources for the day.  Once normal
interactive site use starts approaching half the current limit, the
pipes will be opened up.  In the meantime please help to conserve
resources by pulling only what you need, and caching locally whenever
possible.

The REST API endpoints are defined and documented in `app.yaml`.
Please identify your app in the HTTP headers when calling the API.



