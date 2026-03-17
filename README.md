# Seiko cost front

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.3.

## Steps

1. Run `openapi-ts` to generate swagger classes
2. Run `ng serve` to start the dev server (port 4200)

## Docker image

DO NOT FORGET TO PLAY `openapi-ts` first!!! (not yet in Dockerfile)

1. On Windows, start `Docker Engine` first
2. Run `docker build -t npi-seiko-front-image:1.0.0 -f ./Dockerfile .` to build the image
3. upload the image to server (check your own tag and server IP address!):

- `docker save -o npi-seiko-front-image.tar npi-seiko-front-image:1.0.0`
- `scp npi-seiko-front-image.tar USERNAME@IPADDRESS:/tmp`

4. load the image in the docker of the server

- `docker compose -f /opt/work/docker-compose.yaml down`
- `docker rmi npi-seiko-front-image:1.0.0`
- `docker load -i /tmp/npi-seiko-front-image.tar`
- `docker compose -f /opt/work/docker-compose.yaml up -d`

- `docker compose -f /opt/work/docker-compose.yaml restart web`

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4205/`. The application will automatically reload if you
change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also
use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a
package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out
the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Update dependencies

### 1) Update Angular to latest version

play `ng update @angular/cli @angular/core`

### 2) Update other dependencies

1. check updates (install the tool if not yet done: `npm install npm-check-updates`): `npm-check-updates`
2. update the dependencies: `ncu -u`
3. update the specified dependency: `ncu -u [dependency name]`

## Best Practices in project

### 1) Styles scss

- To style a primeng component:
  - Create the file in the **app/style/components** directory
  - Name the file **'\_[component name].scss'** _example: “\_button.scss_
  - importer le fichier dans **app/style/theme.scss**
- _global.scss_ file :
  - Add global variables (color, style, ...)
  - Add global styles for multiple components
- Development of custom styles directly in the complete style file

### 2) Create/Use dialog

- Create the component in the **app/modales** directory
- Name the file **[modal name]-dialog**
- Manage dialog actions (open, close) in the **app/services/modal.service.ts** file (see example in the file)
- See examples of an existing dialog for data transimission

### 3) Global components

- Create a global component in the **app/components** directory. _Example: button, loader..._

### 4) Handle Error/Display Toast

- To handle global errors, there's a _handleErrorRequestInterceptor_ that retrieves all error responses returned by the
  API and uses **HandleToastMessageService** to display a toast according to the error.
- To display the toast, simply inject the **messageService** into the component constructor and use the **add**
  method.\*
  \*example\*\*: `this.message.add({})`\_
- To display the toast via the error, use the **error** callback in the _subscribe_.

## Add new route

1. Add ids to the RouteID enum file
2. Add/configure in routes.environment file (for example: planning.route.ts)
3. Create || edit the corresponding route file
4. _If necessary, add access configuration to the access.service file_

## Modify access to menus based on roles

1. in Access.service.ts --> what role can see what menus
2. in role.guard.ts and app.routes.ts --> what role can access what url and redirections
3. in login.component.ts --> redirect to correct landing page after login
