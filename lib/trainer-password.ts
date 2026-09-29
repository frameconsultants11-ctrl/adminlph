import bcrypt from "bcryptjs"


const SALT_ROUNDS = 12


export async function hashTrainerPassword(
  password: string
) {
  return bcrypt.hash(
    password,
    SALT_ROUNDS
  )
}


export async function verifyTrainerPassword(
  password: string,
  passwordHash: string
) {
  return bcrypt.compare(
    password,
    passwordHash
  )
}