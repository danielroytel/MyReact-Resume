
I changed the logo with the letter 'W'. Following are the steps I followed:

Goto Figma and type the letter you want in the font you want. I've used Inter Bold with font size 60.
Then export it as svg and open the .svg file in VSCODE.
From there copy the content inside <path d="<COPY EVERYTHING HERE IN THESE QUOTES>"
Paste it in the src/components/icons/loader.js file in the path tag
Now your letter will be shown. Sometimes browsers cache the loading animation so do a hard refresh using Ctrl + Shift + R
The letter might be small/big. Adjust the font size in figma and bring it in again.
The surrounding hexagon might not be aligned. To align it adjust the values in translate in <g id="B" transform="translate(20.000000, 29.000000)">. This will move your letter, not the hexagon so that the loading always stays in the center