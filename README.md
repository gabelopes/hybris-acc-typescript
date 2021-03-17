# Hybris ACC TypeScript

Typescript Module Loader for seamless integration with Hybris ACC.

## Background

This project was born out of a curiosity to use TypeScript to develop Hybris frontend using ACC. Even though simply adding TypeScript and developing ACC modules the default way (creating a property in globally defined ACC object) works appropriately, there is no way to extend other modules' behaviors (as one would with classes hierarchy). This is where this project fills in: it provides a way to declare ACC modules as classes, which allows for subclassing. Not only that, ACC modules are also AMD modules, so everything else works as expected; importing and exporting and even hiding type definitions, constants, enums, etc., all work seamlessly with ACC.

## How does it work?

accts provides a Module Loader for `amd` that treats ACC classes differently. Once it detects an exported class is an ACC class, it creates a new ACC module (in the global object) and replaces the declaration of the exported class by the ACC module. That means everytime a class would be imported, a corresponding ACC module is imported in place.

## How to use it?

### Configuration

To start using **accts** all you need to do is `npm i --save accts`, and make sure to configure your `tsconfig.json` as follows:
```json
{
  "compilerOptions": {
    "module": "amd",
    ...
    "experimentalDecorators": true,
    ...
    "outFile": "./path/to/single/file.js"
  },
  ...
  "include": [
    "node_modules/accts", "<other files>"
  ]
}
```

### What about the code?

To create an ACC module, decorate a class with `@ACC()`. This decorator accepts three optional parameters: `name`, `autoload` and `condition`.

* `name`: Defines a name for the ACC module, so it becomes globally available as `ACC.<name>`. If this parameter is not present, the class name is used.
* `autoload`: an array containing definitions to be inserted in the `_autoload` property of the ACC module. A definition can be either a `keyof T` (where `T` is the class), or it can also be an object as follows:
  ```typescript
  {
    method: keyof T;
    condition: boolean | () => boolean;
    otherwise?: keyof T;
  }
  ```
* `condition`: A condition to define the class as an ACC module. Can be either `boolean` or `() => boolean`.

## Usage Guidelines

Due to the nature of classes in TypeScript and accts, some guidelines are suggested to improve usability.

### Autoload

Every ACC module will have appended in its object a function called `__initialize__` and this function name added to `_autoload`. This function corresponds to the class constructor. So, instead of using `autoload` property of `@ACC`, initialization code can go inside the constructor of the class. **Be careful when subclassing!** If constructor attaches event listeners, these will be attached as many times as there are subclasses. If this is not the desired behavior, use `autoload`.

### Non-static vs. Static methods

Non-static methods should only be used for initialization of an ACC module. All code that is referenced starting from the constructor or `autoload` declared methods should be non-static methods.

This is so, because, even though these methods are available in the global `ACC.<myModule>`, they are not visible via TypeScript type system, since the module is not an instance of the class. Actually, no instance will ever exist. However, it is still possible to access it using for instance `(MyClass as any).myNonStaticMethod(...)`.

Furthermore, `@ACC` is generic, meaning one can use it as `@ACC<MyClass>(...)`, so `autoload` has autocomplete for `public` non-static methods of the class. If no generic type is provided, `autoload` will not have autocomplete features, but it will still help validate that a declared method is present in the class. Again it should be `public` non-static.

In turn, static methods should be part of the public API of the ACC module. All static methods marked `public` are visible from every other module. So they are simply invoked by `MyClass.myStaticMethod()`. Per TypeScript, static methods are also present from subclasses, so they can be overridden.

Lastly, consider using access modifiers appropriately. Besides the required `public` modifier for `autoload`, remember that subclasses will be able to have visibility (or not) of these methods from their respective non-static and static methods, depending on how they are declared.

### Prototype property

To allow appropriate subclassing, a property called `prototype` is defined in every parent ACC module. This way, it is important to never define a method, static or not, or a property called `prototype` in an ACC class, because it may get overwritten.

### Deferred loading

**This will change in the future**. Due to the way the Module Loader is defined, ACC modules have their loading defered, so the Module Loader is available globally by the time they get defined.
