property tdata : {tref:null, tname:"", trat:0, tcmt:"", allkeys:"", selkeys:"", comtxt:""}

-- note the track we will be working with. The player may move to the next
-- song while the script is running, so set the tref and work with that
on getCurrentTrackInfo()
	tell application "iTunes"
		if not (exists current track) then
			return false
		end if
		set tref of tdata to current track
		set tname of tdata to (get name of (tref of tdata))
		set trat of tdata to (get rating of (tref of tdata))
		set tcmt of tdata to (get comment of (tref of tdata))
	end tell
	return true
end getCurrentTrackInfo


on parseTrackInfo(MORUtil)
	if (MORUtil's parseTrackComment(tdata)) then
		set allkeys of tdata to MORUtil's getMORKeywordsList()
		return true
	end if
	return false
end parseTrackInfo


on promptForKeys()
	set ptxt to "Choose keywords that describe \"" & (tname of tdata) & "\""
	set listchoice to choose from list (allkeys of tdata) with prompt ptxt default items (selkeys of tdata) with title "MORKeywords" with multiple selections allowed and empty selection allowed
	if listchoice is false then
		return false
	end if
	set selkeys of tdata to listchoice
	return true
end promptForKeys


on promptForComment()
	set ptxt to "Additional comment for \"" & (tname of tdata) & "\""
	set dlgresult to display dialog ptxt default answer (comtxt of tdata)
	set comtxt of tdata to text returned of dlgresult
	return true
end promptForComment


on promptForRating()
	--                       100,           90-99,        80-89,       70-79,      60-69,   50-59,   40-49, 30-39, 20-29, 10-19, 0-9
	set levels to {"★★★★★", "★★★★½", "★★★★", "★★★½", "★★★", "★★½", "★★", "★½", "★", "½"}
	set ratidx to (11 - ((trat of tdata) div 10))
	if ratidx > 10 then
		set ratidx to 10
	end if
	-- default any unrated items to 3 stars so they are eligible for playlists
	if ((trat of tdata) is missing value) then
		set ratidx to 60
	end if
	set ptxt to "Rate \"" & (tname of tdata) & "\""
	set listchoice to choose from list levels with prompt ptxt default items {(item ratidx of levels)} with title "MORKeywords"
	if listchoice is not false then
		set seltxt to item 1 of listchoice
		set ratidx to 0
		repeat with levtxt in levels
			set ratidx to (ratidx + 1)
			if ((levtxt as text) is equal to (seltxt as text)) then
				exit repeat
			end if
		end repeat
	end if
	set trat of tdata to ((11 - ratidx) * 10)
	return true
end promptForRating


on updateTrackInfo(MORUtil)
	set rawtxt to MORUtil's rebuildTrackComment(tdata)
	tell application "iTunes"
		set comment of (tref of tdata) to rawtxt
		set rating of (tref of tdata) to (trat of tdata)
	end tell
end updateTrackInfo


-- ///////////////////////////////////////////////////////////////////////////
-- // external helper script loader
-- ///////////////////////////////////////////////////////////////////////////

on loadScript(localScriptName)
	tell application "Finder"
		set locpath to container of (path to me) as text
	end tell
	return load script (alias (locpath & localScriptName))
end loadScript


-- ///////////////////////////////////////////////////////////////////////////
-- // Core script processing
-- ///////////////////////////////////////////////////////////////////////////

if getCurrentTrackInfo() then
	set MORUtil to loadScript("MORUtil.scpt")
	if (parseTrackInfo(MORUtil) and promptForKeys() and promptForComment() and promptForRating()) then
		updateTrackInfo(MORUtil)
	end if
end if

