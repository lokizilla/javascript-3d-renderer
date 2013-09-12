javascript-3d-renderer
======================
A port of a software 3D renderer into JavaScript, for use on a HTML5 canvas. A basic index.html template is included, so you can view the scene in-place without much effort.

The original version formed part of my university work, and as such was written in C++, and designed to display a similar scene using GDI+ in Windows.

The original version included directional lighting, which I am yet to implement in this version; at this stage I was more concerned with getting a basic scene rendering than adding additional features.

My next task with this is to improve the rendering speed; performance is generally fine in wireframe mode but introducing flat shading drops the speed dramatically. There's a veritable bucket list of features I could theoretically add, but I feel a little bit of optimisation at this point would probably help it feel more "useful".

I have mainly made this port to assist with my learning of a wider variety of languages, and as such I make no guarantees or promises as to its function. What you see is, indeed, what you get! :)

The main logic is stored in `main.js`, with the Sylvester math library providing the necessary functions and types. jQuery is also a requirement; the index.html file will grab this from the Google CDN.

Credits
=======
>**Sylvester math library**: https://github.com/jcoglan/sylvester *(MIT license)*
>**requestAnimationFrame shim**: http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/ *(CC0 license)*
