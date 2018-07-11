Title: WebGL Attributes
Description: What are attributes in WebGL?

## Attributes

In WebGL1 attributes are global state. WebGL will execute a user supplied vertex shader N times when either `gl.drawArrays` or `gl.drawElements` is called. For each iteration the attributes define how to pull the data out of the buffers bound to them and supply them to the attributes inside the vertex shader.

If they were implemented in JavaScript they would look something like this

```javascript
 // pseudo code
 gl = {
   arrayBuffer: null,
   vertexArray: {
     attributes: [
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ? },
     ],
     elementArrayBuffer: null,
   },
 }
```

As you can see above there are 8 attributes and they are global state.

When you call `gl.enableVertexAttribArray(location)` or `gl.disableVertexAttribArray` you can think of it like this

    // pseudo code
    gl.enableVertexAttribArray = function(location) {
      gl.vertexArray.attributes[location].enable = true;
    };

    gl.disableVertexAttribArray = function(location) {
      gl.vertexArray.attributes[location].enable = false;
    };

In other words location directly refers to the index of an attribute.

Similarly `gl.vertexAttribPointer` would be implemented something like this

    // pseudo code
    gl.vertexAttribPointer = function(location, size, type, normalize, stride, offset) {
      var attrib = gl.vertexArray.attributes[location];
      attrib.size = size;
      attrib.type = type;
      attrib.normalize = normalize;
      attrib.stride = stride ? stride : sizeof(type) * size;
      attrib.offset = offset;
      attrib.buffer = gl.arrayBuffer;  // !!!! <-----
    };

Notice that `attrib.buffer` is set to whatever the current `gl.arrayBuffer` is set to. `gl.arrayBuffer` in the pseudo code abouve would be set by calling `gl.bindBuffer(gl.ARRAY_BUFFER, someBuffer)`.

    // pseudo code
    gl.bindBuffer = function(target, buffer) {
      switch (target) {
        case ARRAY_BUFFER:
          gl.arrayBuffer = buffer;
          break;
        case ELEMENT_ARRAY_BUFFER;
          gl.vertexArray.elementArrayBuffer = buffer;
          break;
      ...
    };

So, next up we have vertex shaders. In vertex shader you declare attributes. Example:

    attribute vec4 position;
    attribute vec2 texcoord;
    attribute vec3 normal;

    ...

    void main() {
      ...
    }

When you link a vertex shader with a fragment shader by calling `gl.linkProgram(someProgram)` WebGL (the driver/GPU/browser) decide on their own which index/location to use for each attribute. Unless you manually assign locations (see below) you have no idea which ones they're going to pick. It's up the the browser/driver/GPU. So, you have to ask it which attribute did you use for position, texcoord and normal?. You do this by calling `gl.getAttribLocation`

    var positionLoc = gl.getAttribLocation(program, "position");
    var texcoordLoc = gl.getAttribLocation(program, "texcoord");
    var normalLoc = gl.getAttribLocation(program, "normal");

Let's say `positionLoc` = `5`. That means when the vertex shader executes (when you call `gl.drawArrays` or` gl.drawElements`) the vertex shader expects you to have setup attribute 5 with the correct type, size, offset, stride, buffer etc.

Note that BEFORE you link the program you can choose the locations by calling `gl.bindAttribLoction(program, location, nameOfAttribute)`. Example:

    // Tell `gl.linkProgram` to assign `position` to use attribute #7
    gl.bindAttribLocation(program, 7, "position");

## Full Attribute State

Missing from the description above is that each attribute also has a default value. It is left out above because it is uncommon to use it.

    attributes: [
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ?
         value: [0, 0, 0, 1], },
       { enable: ?, type: ?, size: ?, normalize: ?, stride: ?, offset: ?, buffer: ?
         value: [0, 0, 0, 1], },
       ..

You can set each attribute's value with the various `gl.vertexAttribXXX` functions. The value is used when enable is false. When enable is true data for the attribute is pulled from the assigned buffer.

## Vertex Array Objects (VAO)s

WebGL has an extension, `OES_vertex_array_object` (and WebGL2 vertex array objects are a default feature)

In the diagram above the `OES_vertex_array_object` extension lets you create and replace the `vertexArray`. In other words

    var vao = ext.createVertexArrayOES();

or in WebGL2

    var vao = gl.createVertexArray()

creates the object you see attached to `gl.vertexArray` in the pseudo code above. Calling `ext.bindVertexArrayOES(vao)` (or `gl.bindVertexArray` in WebGL2) assigns your created vertex array object as the current vertex array.

    // pseudo code
    ext.bindVertexArrayOES = function(vao) {
      gl.vertexArray = vao;
    };

This lets you set all of the attributes and the `ELEMENT_ARRAY_BUFFER` in the current VAO so that when you want to draw a particular shape it's one call to `ext.bindVertexArrayOES` (`gl.bindVertexArray` in WebGL2) to effectively setup all attributes where as without the extension it would be up to one call to both `gl.bindBuffer`, `gl.vertexAttribPointer` (and possibly `gl.enableVertexAttribArray`) **per attribute**.
