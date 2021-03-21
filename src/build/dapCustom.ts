/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { JSONSchema4 } from 'json-schema';

const upperFirst = (x: string) => x.slice(0, 1).toUpperCase() + x.slice(1);

const makeEvent = (name: string, description: string, params: JSONSchema4) => ({
  [`${upperFirst(name)}Event`]: {
    allOf: [
      { $ref: '#/definitions/Event' },
      {
        type: 'object',
        description,
        properties: {
          event: {
            type: 'string',
            enum: [name],
          },
          body: {
            type: 'object',
            ...params,
          },
        },
        required: ['event', 'body'],
      },
    ],
  },
});

const makeRequest = (
  name: string,
  description: string,
  args: JSONSchema4 = {},
  response?: JSONSchema4,
) => ({
  [`${upperFirst(name)}Request`]: {
    allOf: [
      { $ref: '#/definitions/Request' },
      {
        type: 'object',
        description,
        properties: {
          command: {
            type: 'string',
            enum: [name],
          },
          arguments: {
            $ref: `#/definitions/${upperFirst(name)}Arguments`,
          },
        },
        required: ['command', 'arguments'],
      },
    ],
  },
  [`${upperFirst(name)}Arguments`]: {
    type: 'object',
    description: `Arguments for '${name}' request.`,
    ...args,
  },
  [`${upperFirst(name)}Response`]: {
    allOf: [
      { $ref: '#/definitions/Response' },
      {
        type: 'object',
        description: `Response to '${name}' request.`,
        ...(response && {
          properties: {
            body: {
              type: 'object',
              ...response,
            },
          },
          required: ['body'],
        }),
      },
    ],
  },
});

const dapCustom: JSONSchema4 = {
  definitions: {
    ...makeRequest('enableCustomBreakpoints', 'Enable custom breakpoints.', {
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Id of breakpoints to enable.',
        },
      },
      required: ['ids'],
    }),

    ...makeRequest('disableCustomBreakpoints', 'Disable custom breakpoints.', {
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Id of breakpoints to enable.',
        },
      },
      required: ['ids'],
    }),

    ...makeRequest(
      'canPrettyPrintSource',
      'Returns whether particular source can be pretty-printed.',
      {
        properties: {
          source: {
            $ref: '#/definitions/Source',
            description: 'Source to be pretty printed.',
          },
        },
        required: ['source'],
      },
      {
        required: ['canPrettyPrint'],
        properties: {
          canPrettyPrint: {
            type: 'boolean',
            description: 'Whether source can be pretty printed.',
          },
        },
      },
    ),

    ...makeRequest('prettyPrintSource', 'Pretty prints source for debugging.', {
      properties: {
        source: {
          $ref: '#/definitions/Source',
          description: 'Source to be pretty printed.',
        },
        line: {
          type: 'integer',
          description:
            'Line number of currently selected location to reveal after pretty printing. If not present, nothing is revealed.',
        },
        column: {
          type: 'integer',
          description:
            'Column number of currently selected location to reveal after pretty printing.',
        },
      },
      required: ['source'],
    }),

    ...makeRequest('toggleSkipFileStatus', 'Toggle skip status of file.', {
      properties: {
        resource: {
          type: 'string',
          description: 'Url of file to be skipped.',
        },
        sourceReference: {
          type: 'number',
          description: 'Source reference number of file.',
        },
      },
    }),

    ...makeEvent('revealLocationRequested', 'A request to reveal a certain location in the UI.', {
      properties: {
        source: {
          $ref: '#/definitions/Source',
          description: 'The source to reveal.',
        },
        line: {
          type: 'integer',
          description: 'The line number to reveal.',
        },
        column: {
          type: 'integer',
          description: 'The column number to reveal.',
        },
      },
      required: ['source'],
    }),

    ...makeEvent('copyRequested', 'A request to copy a certain string to clipboard.', {
      properties: {
        text: {
          type: 'string',
          description: 'Text to copy.',
        },
      },
      required: ['text'],
    }),

    ...makeEvent(
      'longPrediction',
      'An event sent when breakpoint prediction takes a significant amount of time.',
      {},
    ),

    ...makeEvent(
      'launchBrowserInCompanion',
      'Request to launch a browser in the companion extension within the UI.',
      {
        required: ['type', 'params', 'serverPort', 'launchId'],
        properties: {
          type: {
            type: 'string',
            enum: ['chrome', 'edge'],
            description: 'Type of browser to launch',
          },
          launchId: {
            type: 'number',
            description: 'Incrementing ID to refer to this browser launch request',
          },
          serverPort: {
            type: 'number',
            description: 'Local port the debug server is listening on',
          },
          browserArgs: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          attach: {
            type: 'object',
            required: ['host', 'port'],
            properties: {
              host: { type: 'string' },
              port: { type: 'number' },
            },
          },
          params: {
            type: 'object',
            description: 'Original launch parameters for the debug session',
          },
        },
      },
    ),

    ...makeEvent('killCompanionBrowser', 'Kills a launched browser companion.', {
      required: ['launchId'],
      properties: {
        launchId: {
          type: 'number',
          description: 'Incrementing ID to refer to this browser launch request',
        },
      },
    }),

    ...makeRequest('startProfile', 'Starts taking a profile of the target.', {
      properties: {
        stopAtBreakpoint: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Breakpoints where we should stop once hit.',
        },
        type: {
          type: 'string',
          description: 'Type of profile that should be taken',
        },
        params: {
          type: 'object',
          description: 'Additional arguments for the type of profiler',
        },
      },
      required: ['file', 'type'],
    }),

    ...makeRequest('stopProfile', 'Stops a running profile.'),

    ...makeEvent('profileStarted', 'Fired when a profiling state changes.', {
      required: ['type', 'file'],
      properties: {
        type: {
          type: 'string',
          description: 'Type of running profile',
        },
        file: {
          type: 'string',
          description: 'Location where the profile is saved.',
        },
      },
    }),

    ...makeEvent('profilerStateUpdate', 'Fired when a profiling state changes.', {
      required: ['label', 'running'],
      properties: {
        label: {
          type: 'string',
          description: 'Description of the current state',
        },
        running: {
          type: 'boolean',
          description: 'Set to false if the profile has now ended',
        },
      },
    }),

    ...makeRequest(
      'launchVSCode',
      'Launches a VS Code extension host in debug mode.',
      {
        required: ['args', 'env'],
        properties: {
          args: {
            type: 'array',
            items: {
              $ref: '#/definitions/LaunchVSCodeArgument',
            },
          },
          env: {
            type: 'object',
          },
          debugRenderer: {
            type: 'boolean',
          },
        },
      },
      {
        properties: {
          rendererDebugPort: {
            type: 'number',
          },
        },
      },
    ),

    LaunchVSCodeArgument: {
      type: 'object',
      description:
        'This interface represents a single command line argument split into a "prefix" and a "path" half. The optional "prefix" contains arbitrary text and the optional "path" contains a file system path. Concatenating both results in the original command line argument.',
      properties: {
        path: {
          type: 'string',
        },
        prefix: {
          type: 'string',
        },
      },
    },

    ...makeRequest('launchUnelevated', 'Launches a VS Code extension host in debug mode.', {
      properties: {
        process: {
          type: 'string',
        },
        args: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    }),

    ...makeRequest(
      'remoteFileExists',
      'Check if file exists on remote file system, used in VS.',
      {
        properties: {
          localFilePath: {
            type: 'string',
          },
        },
      },
      {
        required: ['doesExists'],
        properties: {
          doesExists: {
            type: 'boolean',
            description: 'Does the file exist on the remote file system.',
          },
        },
      },
    ),

    ...makeRequest(
      'remoteFileExists',
      'Check if file exists on remote file system, used in VS.',
      {
        properties: {
          localFilePath: {
            type: 'string',
          },
        },
      },
      {
        required: ['doesExists'],
        properties: {
          doesExists: {
            type: 'boolean',
            description: 'Does the file exist on the remote file system.',
          },
        },
      },
    ),

    ...makeRequest('revealPage', 'Focuses the browser page or tab associated with the session.'),

    ...makeRequest('startSelfProfile', 'Starts profiling the extension itself. Used by VS.', {
      required: ['file'],
      properties: {
        file: {
          description: 'File where the profile should be saved',
          type: 'string',
        },
      },
    }),

    ...makeRequest('stopSelfProfile', 'Stops profiling the extension itself. Used by VS.'),

    ...makeRequest(
      'getPerformance',
      'Requests that we get performance information from the runtime.',
      {},
      {
        properties: {
          metrics: {
            type: 'object',
            description:
              "Response to 'GetPerformance' request. A key-value list of runtime-dependent details.",
          },
          error: {
            description: 'Optional error from the adapter',
            type: 'string',
          },
        },
      },
    ),

    ...makeEvent(
      'suggestDisableSourcemap',
      'Fired when requesting a missing source from a sourcemap. UI will offer to disable the sourcemap.',
      {
        properties: {
          source: {
            $ref: '#/definitions/Source',
            description: 'Source to be pretty printed.',
          },
        },
        required: ['source'],
      },
    ),

    ...makeRequest(
      'disableSourcemap',
      'Disables the sourcemapped source and refreshes the stacktrace if paused.',
      {
        properties: {
          source: {
            $ref: '#/definitions/Source',
            description: 'Source to be pretty printed.',
          },
        },
        required: ['source'],
      },
    ),

    ...makeRequest(
      'createDiagnostics',
      'Generates diagnostic information for the debug session.',
      undefined,
      {
        properties: {
          file: {
            type: 'string',
            description: 'Location of the generated report on disk',
          },
        },
        required: ['file'],
      },
    ),
    ...makeEvent(
      'suggestDiagnosticTool',
      "Shows a prompt to the user suggesting they use the diagnostic tool if breakpoints don't bind.",
      {},
    ),
    ...makeRequest(
      'requestCDPProxy',
      'Request WebSocket connection information on a proxy for this debug sessions CDP connection.',
      undefined,
      {
        properties: {
          host: {
            type: 'string',
            description:
              'Name of the host, on which the CDP proxy is available through a WebSocket.',
          },
          port: {
            type: 'number',
            description:
              'Port on the host, under which the CDP proxy is available through a WebSocket.',
          },
        },
      },
    ),
  },
};

export default dapCustom;
