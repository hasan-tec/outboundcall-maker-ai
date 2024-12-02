import { Controller, Post, Req, Res, Body, Query, Param, Get } from '@nestjs/common';
import { BaseCrudController } from '../../common/controllers/base-crud.controller';
import { CallLogService } from './call-log.service';
import { CallLog } from '@/type/database';
import axios from 'axios';

@Controller('call-log')
export class CallLogController extends BaseCrudController<CallLog> {
  constructor(private readonly callLogService: CallLogService) {
    super(callLogService);
  }

  @Post('outbound-call-handler')
  async handleOutboundCall(@Res() response: any) {
    await this.callLogService.handleOutboundCallWebhook(response);
  }

  @Post('make-outbound-call/:id')
  async makeOutboundCall(@Param('id') id: number) {
    const callLog = await this.callLogService.findOne(id);
    const callRes = await this.callLogService.makeOutboundCall(callLog.number, callLog.name);
    await this.callLogService.update(id, { call_sid: callRes.sid });

    return { data: callRes.sid };
  }

  @Get('fetch-from-sheets')
  async fetchFromSheets(@Query('agent') agent: string, @Query('sheetUrl') sheetUrl: string) {
    try {
      const response = await axios.get(sheetUrl);
      const data = response.data;

      const createdLogs = [];
      for (const row of data) {
        const callLog = await this.callLogService.create({
          name: row.name,
          number: row.number,
          agent: parseInt(agent),
          status: 'pending'
        });
        createdLogs.push(callLog);
      }

      return { message: 'Data fetched and saved successfully', data: createdLogs };
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      throw new Error('Failed to fetch data from Google Sheets');
    }
  }
}

