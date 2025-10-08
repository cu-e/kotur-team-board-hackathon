import { AppDataSource } from '../datasource';
import { User } from '../entities/User';
import { signToken } from '../auth/jwt';

export class AuthService {
  static async login(username: string, password: string) {
    // TODO: Если время будет быстро накатить хеш
    let user = await AppDataSource.getRepository(User).findOne({ where: { username } });
    if (!user) {
      user = await AppDataSource.getRepository(User).save({ username, displayName: username });
    }
    const token = signToken({ sub: user.id, username: user.username });
    return { token, user };
  }
}
