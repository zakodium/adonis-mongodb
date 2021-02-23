declare module '@ioc:Adonis/Core/Hash' {
  interface HashersList {
    bcrypt: HashDrivers['bcrypt'];
  }
}
