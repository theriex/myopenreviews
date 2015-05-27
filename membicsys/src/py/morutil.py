import datetime
import re

def nowISO():
    """ Return the current time as an ISO string """
    return dt2ISO(datetime.datetime.utcnow())


def dt2ISO(dt):
    iso = str(dt.year) + "-" + str(dt.month).rjust(2, '0') + "-"
    iso += str(dt.day).rjust(2, '0') + "T" + str(dt.hour).rjust(2, '0')
    iso += ":" + str(dt.minute).rjust(2, '0') + ":"
    iso += str(dt.second).rjust(2, '0') + "Z"
    return iso


def ISO2dt(isostr):
    dt = datetime.datetime.utcnow()
    dt = dt.strptime(isostr, "%Y-%m-%dT%H:%M:%SZ")
    return dt


def canonize(strval):
    """ Convert to lower case and remove all whitespace """
    strval = re.sub(r"\s+", "", strval)
    strval = strval.lower();
    return strval


def intz(val):
    if not val:
        return 0
    if isinstance(val, basestring) and val.startswith("\""):
        val = val[1:len(val) - 1]
    if val == "undefined":
        return 0
    return int(val)


# You can't return a value from a webapp2.RequestHandler, so this method
# does not return a value.  Common error codes:
# 400 Bad Request, 401 Not Authorized, 403 Forbidden, 404 Not Found, 
# 405 Method Not Allowed, 406 Not Acceptable, 409 Conflict
def srverr(handler, code, errtxt):
    handler.error(code)
    handler.response.out.write(errtxt)


def csv_elem_count(csv):
    if not csv:
        return 0
    return csv.count(",") + 1


def csv_list(csv):
    if not csv:
        return []
    return csv.split(",")


def csv_contains(val, csv):
    if not csv:
        return False
    if csv == val:
        return True
    if csv.startswith(val + ","):
        return True
    index = csv.find("," + val)
    if index >= 0:
        return True
    return False


def remove_from_csv(val, csv):
    if not csv or csv == val:
        return ""
    if csv.startswith(val + ","):
        return csv[len(val) + 1:]
    val = "," + val
    index = csv.find(val)
    if index >= 0:
        return csv[0:index] + csv[index + len(val):]
    return csv


# CSV strings longer than 1000 elements are cumbersome to the point of
# being useless, so roll previous elements off the end to reasonably
# bound the length.
def prepend_to_csv(val, csv, upperbound=1000):
    if not csv:
        return val
    if csv_elem_count(csv) >= upperbound:
        csv = csv[0:csv.rfind(",")]
    return val + "," + csv


def append_to_csv(val, csv):
    val = str(val)
    if not csv:
        return val
    return csv + "," + val


def list_to_csv(values):
    csv = ""
    for val in values:
        csv = append_to_csv(val, csv)
    return csv
