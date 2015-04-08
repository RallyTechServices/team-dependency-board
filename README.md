#Team Dependency Board  (In progress)
SDK:  2.0
Uses LBAPI:  No

Team Dependency Board is a tool intended to be used during release planning to help facilitate communication
of story dependencies between teams that may not be doing planning at the same time.

The team creating a story that they are dependent on is known as the issuing team, or "Issuer".  The team that the dependency is for is known as the "Receiver".

The process for the teams to follow when creating a story that is a dependency is as follows.   The issuing team is responsible for doing the following when creating the story:

* Marks the story with a tag with the text "Dependency".
* Marks the story with a tag in the following format:  "Issuer: (team name)"
* Put the story into the desired sprint in the receiving team's project

Only tags with the text "Dependency"  will show up in the board.
Only Iterations that overlap with the selected release will be shown on the board.
Only stories that are explicitly associated with the selected release (by Name) will be displayed.
It is assumed that iterations with the same name have the same start and end dates.

The "Ready" flag will be used to show that a story has been accepted by the receiving team.  If a story is not ready and the story has no displayColor associated with it,  it's card will render with a Red border.
 If there is a display color associated with the story, that will override the red border when the card renders.
