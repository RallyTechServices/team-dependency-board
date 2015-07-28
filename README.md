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

The columns are Iterations and the swim lanes are the teams (Projects).
Only tags with the text "Dependency"  will show up in the board.
Only stories that are explicitly associated with the selected release (by Name) will be displayed.
It is assumed that iterations with the same name have the same start and end dates.

The "Ready" flag will be used to show that a story has been accepted by the receiving team.  If a story is not ready and the story has no displayColor associated with it,  it's card will render with a Red border.
If there is a display color associated with the story, that will override the red border when the card renders.

####Iteration display for the board
Only Iterations that overlap with the selected release timebox will be shown on the board.
For releases where the format of the release matches "Release <number>", the iterations will also be filtered by the prefix "R<number>".
For example, if Release 3 is selected, only iterations that overlap with the Release 3 timebox AND have a name prefixed with "R3" will be displayed.
If "Future Release" is selected, only iterations that overlap with the Future Release timebox will be displayed, but the iteration names will not be filtered by a specific prefix.

![ScreenShot] (/images/team-dependency-board.png)

####Updates 2015-07-28
*  Added Estimated Blocker Resolution time (if populated for the story)
*  Added a checkbox toggle to show the items that are "Done" - by default the items that are "Done" are hidden from the board.  "Done" means that the dependency has been Agreed to and is also in the Accepted state.  If a story is in the accepted state, but has not been Agreed to, it will still show up on the board.  
*  If a story is in the Accepted State, it will show up with a gray background and lighter text.  
*  Made the Sprint Name text slightly smaller.  