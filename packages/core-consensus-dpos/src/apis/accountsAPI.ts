import { DeprecatedAPIError } from '@risevision/core-apis';
import {
  IAccountsModule,
  ISystemModule,
  Symbols,
} from '@risevision/core-interfaces';
import {
  HTTPError,
  IoCSymbol,
  SchemaValid,
  ValidateSchema,
} from '@risevision/core-utils';
import { inject, injectable } from 'inversify';
import {
  Get,
  JsonController,
  Post,
  Put,
  QueryParams,
} from 'routing-controllers';
import * as z_schema from 'z-schema';
import { dPoSSymbols } from '../helpers/';
import { AccountsModelForDPOS } from '../models';
import { DelegatesModule } from '../modules';

// tslint:disable-next-line no-var-requires
const schema = require('../../schema/accountsAPI.json');

@JsonController('/api/accounts')
@injectable()
@IoCSymbol(dPoSSymbols.accountsAPI)
export class AccountsAPI {
  @inject(Symbols.generic.zschema)
  public schema: z_schema;
  @inject(Symbols.modules.accounts)
  private accounts: IAccountsModule<AccountsModelForDPOS>;
  @inject(dPoSSymbols.modules.delegates)
  private delegatesModule: DelegatesModule;

  @inject(Symbols.modules.system)
  private system: ISystemModule;

  @Get('/delegates')
  @ValidateSchema()
  public async getDelegates(@SchemaValid(schema.getDelegates)
  @QueryParams()
  params: {
    address: string;
  }) {
    const account = await this.accounts.getAccount({ address: params.address });
    if (!account) {
      throw new HTTPError('Account not found', 200);
    }
    if (account.delegates) {
      const { delegates } = await this.delegatesModule.getDelegates({
        orderBy: 'rank:desc',
      });
      return {
        delegates: delegates
          .filter(
            (d) => account.delegates.indexOf(d.delegate.hexPublicKey) !== -1
          )
          .map((d) => ({
            address: d.delegate.address,
            approval: d.info.approval,
            missedblocks: d.delegate.missedblocks,
            producedblocks: d.delegate.producedblocks,
            productivity: d.info.productivity,
            publicKey: d.delegate.hexPublicKey,
            rank: d.info.rank,
            rate: d.info.rank,
            username: d.delegate.username,
            vote: d.delegate.vote,
          })),
      };
    }
    return { publicKey: account.publicKey };
  }

  @Get('/delegates/fee')
  @ValidateSchema()
  public async getDelegatesFee(@SchemaValid(schema.getDelegatesFee, {
    castNumbers: true,
  })
  @QueryParams()
  params: {
    height: number;
  }) {
    return {
      fee: this.system.getFees(params.height).fees.delegate,
    };
  }

  @Put('/delegates')
  public async addDelegate() {
    throw new DeprecatedAPIError();
  }

  @Post('/generatePublicKey')
  public async generatePublicKey() {
    throw new DeprecatedAPIError();
  }
}