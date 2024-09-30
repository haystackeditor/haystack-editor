# Features on the Roadmap

## Minimap

Create a floating minimap in Haystack that accurately depicts where editors on the canvas are.

- Minimap items should be colored in correspondence with the editor header color
- Minimap items should display the label of the editor when hovered
- The viewport of the minimap should be based on the union of the bounding boxes of all editors

## Group editors together

Create an action that allows different editors to be grouped together, similar to Figma.

- When an individual item in a group is dragged or resized, every item in the group should be dragged or resized
- Groups should be be visually distinct e.g. have a dashed outline that is faint
- Recursive grouping should probably not be allowed

## Display the call graph of functions recursively

For incoming/outgoing calls, allow the user to traverse multiple levels deep in the call hierarchy.

- Give the user the option to open the entire path (i.e. all functions in the hierarchy) on the canvas at once, or individual functions
- Dealing with multiple callsites might prove to be a UI challenge

## Hold shift to swap editors like a grid system

When the user hold shift, editors should swap when held over one another

- The swap detection should be debounced so that if a user drags over several editors, it only swaps over the one the user hovers over

## Make pinned editors behave like tiled windows that can be moved around to occupy a portion of the screen

Moving pinned editors should cause them to aggressively tile the screen.

- For example, if you move a pinned editor to the left side of the screen and let go of it, it should expand to take up the left side of the screen. If you move it to the upper left, it should expand to take up the upper left quadrant of the screen, etc.
- Pinned editors should be somewhat magnetic and snap to adjacent pinned editors when moved beside one

## Create a mechanism for labeling editors with user input

Pretty self-explanatory. The user should be able to perform an action that allows them to input a specific label that exists for the lifetime of an editor.

- How do we distinguish between the file name and label?

## Create a more semantic grouping system

This is a feature that should be prioritized LAST. The idea behind is that the codebase should be organized and categorized by the function of the file/symbol e.g. UI components, databases, etc.

- Can this be achieved without the use of AI?
