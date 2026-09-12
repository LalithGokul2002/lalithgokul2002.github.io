Screenshots and GIFs for the project cards.

Naming used by index.html:
  bluff-game.gif       (or .png / .jpg)
  sprite-flight.gif

Card image area is 200px tall and full card width, so a 16:9 or
2:1 capture crops well. object-fit: cover handles the rest.

Keep GIFs under about 3 MB - anything larger stalls the page on
mobile. ScreenToGif exports smaller files than Game Bar recordings.

After adding a file, open index.html, find the matching card, delete
the <div class="project-placeholder"> line and uncomment the <img>
line directly above it.
