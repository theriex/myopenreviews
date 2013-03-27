import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api import images
import logging
from moracct import *
from pen import PenName, authorized


class Relationship(db.Model):
    """ A relationship from one Pen Name to another. """
    originid = db.IntegerProperty(required=True)
    relatedid = db.IntegerProperty(required=True)
    # No relationship means "not following".  The remaining possible 
    # status values are "following" or "blocked".
    status = db.StringProperty()
    # Filter fields describe information produced by relatedid that
    # originid would prefer to not see.
    # A CSV of review types that should not be displayed
    mute = db.StringProperty()
    # The minimum rating a review must have to be displayed
    cutoff = db.IntegerProperty()


@db.transactional(xg=True)
def add_relationship(rel):
    origin = PenName.get_by_id(rel.originid)
    origin.following += 1
    related = PenName.get_by_id(rel.relatedid)
    related.followers += 1
    origin.put()
    related.put()
    rel.put()
    return [ origin, related, rel ]


@db.transactional(xg=True)
def delete_relationship(rel):
    origin = PenName.get_by_id(rel.originid)
    origin.following -= 1
    related = PenName.get_by_id(rel.relatedid)
    related.followers -= 1
    origin.put()
    related.put()
    db.delete(rel)
    return [ origin, related ]
    

def relationship_modification_authorized(handler):
    """ Return true if the originid matches a pen name the caller is 
        authorized to modify. """
    acc = authenticated(handler.request)
    if not acc:
        handler.error(401)
        handler.response.out.write("Authentication failed")
        return False
    originid = intz(handler.request.get('originid'))
    pen = PenName.get_by_id(originid)
    if not pen:
        handler.error(404)
        handler.response.out.write("Pen " + str(originid) + " not found.")
        return False
    authok = authorized(acc, pen)
    if not authok:
        handler.error(401)
        handler.response.out.write("Pen name not authorized.")
        return False
    return True


def valid_relationship_modification(handler, rel):
    """ Return true if the rel exists, and the rel.originid matches. """
    if not rel:
        handler.error(404)
        handler.response.out.write("Relationship not found.")
        return False
    # They own the pen name specified in the originid, but the originid of
    # the relationship to be modified belongs to someone else.  The 
    # originid and relatedid don't change.
    originid = intz(handler.request.get('originid'))
    if rel.originid != originid:
        handler.error(401)
        handler.response.out.write("Relationship not authorized.")
        return False
    return True


class CreateRelationship(webapp2.RequestHandler):
    def post(self):
        if not relationship_modification_authorized(self):
            return
        originid = intz(self.request.get('originid'))
        relatedid = intz(self.request.get('relatedid'))
        rel = Relationship(originid=originid, relatedid=relatedid)
        rel.status = self.request.get('status')
        rel.mute = self.request.get('mute')
        rel.cutoff = 0
        cutoffstr = self.request.get('cutoff')
        if cutoffstr:
            rel.cutoff = intz(cutoffstr)
        elements = add_relationship(rel)
        returnJSON(self.response, elements)


class DeleteRelationship(webapp2.RequestHandler):
    def post(self):
        if not relationship_modification_authorized(self):
            return
        relid = self.request.get('_id')
        rel = Relationship.get_by_id(intz(relid))
        if not valid_relationship_modification(self, rel):
            return
        elements = delete_relationship(rel)
        returnJSON(self.response, elements)


class UpdateRelationship(webapp2.RequestHandler):
    def post(self):
        if not relationship_modification_authorized(self):
            return
        relid = self.request.get('_id')
        rel = Relationship.get_by_id(intz(relid))
        if not valid_relationship_modification(self, rel):
            return
        # originid is never modified
        # relatedid is never modified
        rel.status = self.request.get('status')
        rel.mute = self.request.get('mute')
        rel.cutoff = 0
        cutoffstr = self.request.get('cutoff')
        if cutoffstr:
            rel.cutoff = intz(cutoffstr)
        rel.put()
        returnJSON(self.response, [ rel ])


class FindRelationships(webapp2.RequestHandler):
    def get(self):
        acc = authenticated(self.request)
        if not acc:
            self.error(401)
            self.response.out.write("Authentication failed")
            return
        field = "unspecified"
        value = 0
        originid = self.request.get('originid')
        relatedid = self.request.get('relatedid')
        if originid:
            field = "originid"
            value = intz(originid)
        elif relatedid:
            field = "relatedid"
            value = intz(relatedid)
        where = "WHERE " + field + "=:1 LIMIT 20"
        offset = self.request.get('offset')
        if offset:
            where += " OFFSET " + offset
        rels = Relationship.gql(where, value)
        cursor = self.request.get('cursor')
        if cursor:
            rels.with_cursor(start_cursor = cursor)
        # logging.info("FindRelationships " + field + " " + str(value))
        maxpull = 100
        pulled = 0
        cursor = ""
        results = []
        for rel in rels:
            pulled += 1
            results.append(rel)
            if pulled >= maxpull or len(results) >= 20:
                # hit the max, get cursor to use for next fetch
                cursor = rels.cursor()
                break
        returnJSON(self.response, results, cursor, pulled)

    
app = webapp2.WSGIApplication([('/newrel', CreateRelationship),
                               ('/updrel', UpdateRelationship),
                               ('/delrel', DeleteRelationship),
                               ('/findrels', FindRelationships)], debug=True)

