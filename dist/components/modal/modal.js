define(['framework', 'text!./modal.html'],
    function(framework, template) {

        var ViewModel = function (params, componentInfo) {
            var self = this;

            self.framework = framework;
        };

        return {
            viewModel: {
                createViewModel: function(params, componentInfo) {
                    return new ViewModel(params, componentInfo);
                }
            },
            template: template
        };
    });