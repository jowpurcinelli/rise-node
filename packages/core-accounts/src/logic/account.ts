import { CoreSymbols } from '@risevision/core';
import {
  AccountDiffType,
  AccountFilterData,
  IAccountLogic,
  IAccountsModel,
  IIdsHandler,
  ILogger,
  Symbols,
} from '@risevision/core-interfaces';
import { LaunchpadSymbols } from '@risevision/core-launchpad';
import { ModelSymbols } from '@risevision/core-models';
import {
  Address,
  ConstantsType,
  DBOp,
  ModelAttributes,
} from '@risevision/core-types';
import * as filterObject from 'filter-object';
import { inject, injectable, named, postConstruct } from 'inversify';
import * as sequelize from 'sequelize';
import { Op } from 'sequelize';
import * as z_schema from 'z-schema';
import { AccountsSymbols } from '../symbols';
import { accountsModelCreator } from './models/account';
import { IModelField } from './models/modelField';

@injectable()
export class AccountLogic implements IAccountLogic {
  private table = 'mem_accounts';

  /**
   * All fields
   */
  private fields: Array<{
    alias: string;
    field?: string;
    expression?: string;
  }> = [];

  /**
   * Conversions by fieldName
   */
  private conv: { [fieldName: string]: any } = {};

  private model: IModelField[];

  /**
   * List of editable fields.
   */
  private editable: string[];

  @inject(CoreSymbols.constants)
  private constants: ConstantsType;

  @inject(Symbols.helpers.idsHandler)
  private idsHandler: IIdsHandler;

  @inject(Symbols.helpers.logger)
  private logger: ILogger;

  @inject(ModelSymbols.model)
  @named(AccountsSymbols.model)
  private AccountsModel: typeof IAccountsModel;

  @inject(LaunchpadSymbols.zschema)
  private schema: z_schema;

  @postConstruct()
  public postConstruct() {
    this.model = accountsModelCreator(this.table, this.constants);

    this.fields = this.model.map((field) => {
      const tmp: any = {};
      if (field.expression) {
        tmp.expression = field.expression;
      } else {
        if (field.mod) {
          tmp.expression = field.mod;
        }
        tmp.field = field.name;
      }
      if (tmp.expression || field.alias) {
        tmp.alias = field.alias || field.name;
      }
      return tmp;
    });

    // conversions
    this.model.forEach((field) => (this.conv[field.name] = field.conv));

    // build editable fields
    this.editable = this.model
      .filter((field) => !field.immutable)
      .map((field) => field.name);
  }

  /**
   * Get account information for specific fields and filtering criteria
   */
  // tslint:disable-next-line max-line-length
  public get(filter: AccountFilterData): Promise<IAccountsModel> {
    return this.getAll(filter).then((res) => res[0]);
  }

  /**
   * Get accountS information for specific fields and filtering criteria.
   */
  public getAll(filter: AccountFilterData): Promise<IAccountsModel[]> {
    const sort: any = filter.sort ? filter.sort : {};

    const { limit, offset } = filter;

    delete filter.sort;
    delete filter.limit;
    delete filter.offset;

    // Remove fields = undefined (such as limit, offset and sort)
    Object.keys(filter).forEach((k) => {
      if (typeof filter[k] === 'undefined') {
        delete filter[k];
      }
    });

    return Promise.resolve(
      this.AccountsModel.findAll({
        limit: limit > 0 ? limit : undefined,
        offset: offset > 0 ? offset : undefined,
        order:
          typeof sort === 'string'
            ? [[sort, 'ASC']]
            : Object.keys(sort).map((col) => [
                col,
                sort[col] === -1 ? 'DESC' : 'ASC',
              ]),
        where: filter,
      })
    );
  }

  /**
   * Sets fields for specific address in mem_accounts table
   * @param {string} address
   * @param fields
   */
  public async set(address: Address, fields: ModelAttributes<IAccountsModel>) {
    fields.address = address;
    await this.AccountsModel.upsert(fields);
  }

  /**
   * @param {string} address
   * @param diff
   * @returns {any}
   */
  // tslint:disable-next-line cognitive-complexity
  public merge(address: Address, diff: AccountDiffType): Array<DBOp<any>> {
    const update: any = {};
    const dbOps: Array<DBOp<any>> = [];

    for (const fieldName of this.editable) {
      if (typeof diff[fieldName] === 'undefined') {
        continue;
      }
      const trueValue = diff[fieldName];
      switch (this.conv[fieldName]) {
        case String:
          update[fieldName] = trueValue;
          break;
        case BigInt:
          let fixedValue: bigint = trueValue;
          let operand = '+';
          if (trueValue < 0n) {
            fixedValue = -fixedValue;
            operand = '-';
          }
          update[fieldName] = sequelize.literal(
            `${fieldName} ${operand} ${fixedValue}`
          );
          // If decrementing u_balance on account
          if (fieldName === 'u_balance' && operand === '-') {
            // Remove virginity and ensure marked columns become immutable
            update.virgin = 0;
          }
          break;
        case Number:
          if (isNaN(trueValue) || trueValue === Infinity) {
            throw new Error(`Encountered insane number: ${trueValue}`);
          }
          if (Math.abs(trueValue) === trueValue && trueValue !== 0) {
            update[fieldName] = sequelize.literal(
              `${fieldName} + ${Math.floor(trueValue)}`
            );
          } else if (trueValue < 0) {
            update[fieldName] = sequelize.literal(
              `${fieldName} - ${Math.floor(Math.abs(trueValue))}`
            );
          }
          break;
      }
    }

    dbOps.push({
      model: this.AccountsModel,
      options: {
        limit: 1,
        where: { address },
      },
      type: 'update',
      values: update,
    });

    return dbOps;
  }

  /**
   * Removes an account from mem_account table based on address.
   * @param {string} address
   * @returns {Promise<number>}
   */
  public async remove(address: string): Promise<number> {
    return await this.AccountsModel.destroy({
      where: { address: address.toUpperCase() },
    });
  }

  public generateAddressFromPubData(pubData: Buffer): Address {
    return this.idsHandler.addressFromPubData(pubData);
  }
}
